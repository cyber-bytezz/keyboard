import { createFileRoute } from "@tanstack/react-router";

/**
 * Dodo Payments webhook receiver. Register this URL
 * (`<your-domain>/api/webhooks/dodo`) as a webhook endpoint in the Dodo
 * dashboard and set DODO_PAYMENTS_WEBHOOK_SECRET to the signing secret it
 * gives you.
 *
 * The event `type` matching and payload shape below are unverified guesses
 * (see src/lib/dodo.server.ts's header comment) — matched loosely
 * (`.includes(...)`) on purpose so small naming differences from the real
 * API don't silently no-op every event. Metadata carries our own bid id,
 * which is the one thing this handler can rely on regardless of exactly
 * how Dodo names its other fields.
 */
export const Route = createFileRoute("/api/webhooks/dodo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();

        const { verifyWebhookSignature } = await import("@/lib/dodo.server");
        const verified = await verifyWebhookSignature({ headers: request.headers, rawBody });
        if (!verified) {
          return new Response("invalid signature", { status: 401 });
        }

        let event: { type?: unknown; data?: Record<string, unknown> };
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const type = String(event.type ?? "").toLowerCase();
        const data = event.data ?? {};
        const nested = (data["object"] ?? {}) as Record<string, unknown>;
        const metadata = (data["metadata"] ?? nested["metadata"] ?? {}) as Record<string, unknown>;
        const bidId = typeof metadata["bid_id"] === "string" ? metadata["bid_id"] : undefined;
        const paymentId =
          (typeof data["payment_id"] === "string" && data["payment_id"]) ||
          (typeof data["id"] === "string" && data["id"]) ||
          (typeof nested["id"] === "string" && nested["id"]) ||
          undefined;

        if (!bidId) {
          // Nothing of ours to act on — ack so Dodo doesn't keep retrying.
          return new Response("ok", { status: 200 });
        }

        const { confirmBidPayment, failBid } = await import("@/lib/bids.server");

        if (type.includes("succeeded") || type.includes("completed") || type.includes("paid")) {
          if (paymentId) {
            await confirmBidPayment({ bidId, paymentId });
          } else {
            console.error(`Dodo webhook '${type}' for bid ${bidId} carried no payment id`);
          }
        } else if (type.includes("failed") || type.includes("cancel") || type.includes("expired")) {
          await failBid({ bidId });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
