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

  // Record the bid as the new leader.
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
      status: "active",
    })
    .select("id")
    .single();

  if (bidError || !bid) throw new Error("Could not record the bid");

  // Everyone who was leading this spot before is now outbid.
  await supabaseAdmin
    .from("bids")
    .update({ status: "outbid" })
    .eq("spot_id", spot.id)
    .eq("status", "active")
    .neq("id", bid.id);

  // The leading bidder holds the cap. At the $6 cap the spot closes for good.
  const reachedCap = input.amount >= MAX_BID;
  const { error: spotUpdateError } = await supabaseAdmin
    .from("sponsor_spots")
    .update({
      current_price: input.amount,
      sponsor_name: input.company,
      ...(logoPath ? { sponsor_logo_url: logoPath } : {}),
      status: reachedCap ? "taken" : "open",
    })
    .eq("id", spot.id);

  if (spotUpdateError) throw new Error("Bid saved, but the board could not be updated");

  if (reachedCap) {
    await supabaseAdmin.from("bids").update({ status: "won" }).eq("id", bid.id);
  }

  return {
    bidId: bid.id as string,
    amount: input.amount,
    deposit,
    reachedCap,
    checkoutUrl: null as string | null,
  };
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
