import { DEPOSIT_RATE, MAX_BID, MIN_INCREMENT } from "./keyboard-layout";

export type PlaceBidInput = {
  spotId: string;
  bidderName: string;
  bidderEmail: string;
  company: string;
  amount: number;
  logoDataUrl: string | null;
  logoFilename: string | null;
  origin: string;
};

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"] as const;

async function uploadLogo(
  supabaseAdmin: any,
  dataUrl: string,
  filename: string | null,
): Promise<string | null> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match;
  if (!ALLOWED_LOGO_TYPES.includes(mime as (typeof ALLOWED_LOGO_TYPES)[number])) return null;
  const bytes = Uint8Array.from(atob(base64!), (c) => c.charCodeAt(0));
  if (bytes.byteLength > 2 * 1024 * 1024) return null;
  const ext = (filename?.split(".").pop() ?? "png").replace(/[^a-z0-9]/gi, "").slice(0, 5);
  const path = `${crypto.randomUUID()}.${ext || "png"}`;
  const { error } = await supabaseAdmin.storage
    .from("sponsor-logos")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) return null;
  return path;
}

/**
 * Submits a bid. This only *reserves* the keycap and starts a Dodo Payments
 * checkout — the bid stays "pending" and the spot's price/status are
 * untouched until the checkout actually completes and Dodo's webhook calls
 * confirmBidPayment() below. See routes/api/webhooks/dodo.ts.
 */
export async function placeBid(input: PlaceBidInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: spot, error: spotError } = await supabaseAdmin
    .from("sponsor_spots")
    .select("id, label, key_code, current_price, status")
    .eq("id", input.spotId)
    .maybeSingle();

  if (spotError) throw new Error("Could not load that keycap");
  if (!spot) throw new Error("That keycap does not exist");
  if (spot.status !== "open") throw new Error("That keycap is already taken");

  if (spot.current_price >= MAX_BID) {
    throw new Error(`This keycap is already at the $${MAX_BID} cap — no higher bids possible`);
  }
  const minimum = Math.min(Math.max(spot.current_price + MIN_INCREMENT, 2), MAX_BID);
  if (input.amount < minimum) {
    throw new Error(`Bid must be at least $${minimum}`);
  }
  if (input.amount > MAX_BID) {
    throw new Error(`Bids are capped at $${MAX_BID} — this board stays affordable`);
  }

  const logoPath = input.logoDataUrl
    ? await uploadLogo(supabaseAdmin, input.logoDataUrl, input.logoFilename)
    : null;

  const deposit = Math.round(input.amount * DEPOSIT_RATE);

  const { data: bid, error: bidError } = await supabaseAdmin
    .from("bids")
    .insert({
      spot_id: spot.id,
      bidder_name: input.bidderName,
      bidder_email: input.bidderEmail,
      company: input.company,
      logo_url: logoPath,
      amount: input.amount,
      deposit_amount: deposit,
      status: "pending",
    })
    .select("id")
    .single();

  if (bidError || !bid) throw new Error("Could not record the bid");

  try {
    const { createCheckoutSession } = await import("./dodo.server");
    const checkout = await createCheckoutSession({
      amountCents: input.amount * 100,
      bidderEmail: input.bidderEmail,
      bidderName: input.bidderName,
      returnUrl: `${input.origin}/?bid=${bid.id}`,
      metadata: { bid_id: bid.id, spot_id: spot.id },
    });

    await supabaseAdmin
      .from("bids")
      .update({ dodo_checkout_session_id: checkout.sessionId })
      .eq("id", bid.id);

    return {
      bidId: bid.id as string,
      amount: input.amount,
      deposit,
      reachedCap: false,
      checkoutUrl: checkout.checkoutUrl,
    };
  } catch (err) {
    // Checkout couldn't be created — don't leave a dangling pending bid
    // sitting in the way of the next bidder.
    console.error("Dodo checkout session creation failed", err);
    await supabaseAdmin.from("bids").update({ status: "failed" }).eq("id", bid.id);
    throw new Error("Could not start checkout — please try again");
  }
}

/**
 * Called by the Dodo webhook once a checkout actually pays. Promotes the
 * bid to the spot's new leader and refunds whoever it displaces — either
 * the previous leader (normal outbid) or, if two checkouts for the same
 * spot were in flight at once and a higher one already won, this bidder
 * themself (paid, but didn't end up winning).
 */
export async function confirmBidPayment(input: { bidId: string; paymentId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { refundPayment } = await import("./dodo.server");

  const { data: bid, error: bidError } = await supabaseAdmin
    .from("bids")
    .select("id, spot_id, amount, company, logo_url, status")
    .eq("id", input.bidId)
    .maybeSingle();
  if (bidError || !bid) {
    console.error(`confirmBidPayment: bid ${input.bidId} not found`);
    return;
  }
  if (bid.status !== "pending") return; // already processed — webhooks can repeat

  const { data: spot, error: spotError } = await supabaseAdmin
    .from("sponsor_spots")
    .select("id, current_price, status")
    .eq("id", bid.spot_id)
    .maybeSingle();
  if (spotError || !spot) {
    console.error(`confirmBidPayment: spot for bid ${bid.id} not found`);
    return;
  }

  const lostTheRace = spot.status === "taken" || spot.current_price >= bid.amount;
  if (lostTheRace) {
    await supabaseAdmin
      .from("bids")
      .update({ status: "outbid", dodo_payment_id: input.paymentId })
      .eq("id", bid.id);
    await refundAndRecord(supabaseAdmin, refundPayment, {
      id: bid.id,
      paymentId: input.paymentId,
      amountCents: bid.amount * 100,
    });
    return;
  }

  const reachedCap = bid.amount >= MAX_BID;

  const { data: previousLeaders } = await supabaseAdmin
    .from("bids")
    .select("id, amount, dodo_payment_id")
    .eq("spot_id", spot.id)
    .eq("status", "active");

  for (const prev of previousLeaders ?? []) {
    await supabaseAdmin.from("bids").update({ status: "outbid" }).eq("id", prev.id);
    if (prev.dodo_payment_id) {
      await refundAndRecord(supabaseAdmin, refundPayment, {
        id: prev.id,
        paymentId: prev.dodo_payment_id,
        amountCents: prev.amount * 100,
      });
    }
  }

  await supabaseAdmin
    .from("bids")
    .update({ status: reachedCap ? "won" : "active", dodo_payment_id: input.paymentId })
    .eq("id", bid.id);

  await supabaseAdmin
    .from("sponsor_spots")
    .update({
      current_price: bid.amount,
      sponsor_name: bid.company,
      ...(bid.logo_url ? { sponsor_logo_url: bid.logo_url } : {}),
      status: reachedCap ? "taken" : "open",
    })
    .eq("id", spot.id);
}

async function refundAndRecord(
  supabaseAdmin: any,
  refundPayment: (input: { paymentId: string; amountCents: number }) => Promise<{
    refundId: string | null;
  }>,
  bid: { id: string; paymentId: string; amountCents: number },
) {
  try {
    const refund = await refundPayment({ paymentId: bid.paymentId, amountCents: bid.amountCents });
    if (refund.refundId) {
      await supabaseAdmin.from("bids").update({ refund_id: refund.refundId }).eq("id", bid.id);
    }
  } catch (err) {
    // The bid is already marked outbid — surfacing this only in logs is a
    // deliberate tradeoff so a refund hiccup doesn't block the webhook from
    // acking. Needs manual follow-up (or a retry job) if this ever fires.
    console.error(`Refund failed for bid ${bid.id} (payment ${bid.paymentId})`, err);
  }
}

/** Called by the webhook when a checkout never completes (expired, canceled, declined). */
export async function failBid(input: { bidId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("bids")
    .update({ status: "failed" })
    .eq("id", input.bidId)
    .eq("status", "pending"); // don't clobber a bid a concurrent webhook already confirmed
}

/** Private bucket — logos are served through short-lived signed URLs. */
export async function signLogoPaths(paths: string[]) {
  if (paths.length === 0) return {} as Record<string, string>;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from("sponsor-logos")
    .createSignedUrls(paths, 60 * 60);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}
