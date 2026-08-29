-- Switch bid payment tracking from the never-wired Stripe columns to Dodo
-- Payments, and add a refund reference for the outbid-refund flow.
ALTER TABLE public.bids RENAME COLUMN stripe_session_id TO dodo_checkout_session_id;
ALTER TABLE public.bids RENAME COLUMN stripe_payment_intent_id TO dodo_payment_id;
ALTER TABLE public.bids ADD COLUMN refund_id text;

CREATE INDEX IF NOT EXISTS bids_dodo_checkout_session_id_idx
  ON public.bids(dodo_checkout_session_id);

-- Pending bids were already private; failed ones (payment never landed)
-- shouldn't show up in public bid history either.
DROP POLICY IF EXISTS "Confirmed bid history is public" ON public.bids;
CREATE POLICY "Confirmed bid history is public" ON public.bids
  FOR SELECT TO anon, authenticated USING (status NOT IN ('pending', 'failed'));
