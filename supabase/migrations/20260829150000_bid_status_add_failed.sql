-- Payment-gated bids need a terminal state for checkouts that never pay
-- (expired, canceled, or declined) — distinct from 'outbid' (paid, then
-- superseded and refunded). ALTER TYPE ... ADD VALUE must be the only
-- statement run against the enum in its transaction, so it gets its own
-- migration file.
ALTER TYPE public.bid_status ADD VALUE IF NOT EXISTS 'failed';
