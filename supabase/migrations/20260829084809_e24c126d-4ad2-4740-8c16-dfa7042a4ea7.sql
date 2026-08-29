CREATE TYPE public.spot_status AS ENUM ('open','taken');
CREATE TYPE public.bid_status AS ENUM ('pending','active','outbid','won');
CREATE TYPE public.spot_tier AS ENUM ('accent','home_row','enter_shift','spacebar');

CREATE TABLE public.sponsor_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code text NOT NULL UNIQUE,
  label text NOT NULL,
  tier public.spot_tier NOT NULL,
  base_price integer NOT NULL,
  current_price integer NOT NULL,
  status public.spot_status NOT NULL DEFAULT 'open',
  sponsor_name text,
  sponsor_logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sponsor_spots TO anon, authenticated;
GRANT ALL ON public.sponsor_spots TO service_role;
ALTER TABLE public.sponsor_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sponsor spots are public" ON public.sponsor_spots FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES public.sponsor_spots(id) ON DELETE CASCADE,
  bidder_name text NOT NULL,
  bidder_email text NOT NULL,
  company text NOT NULL,
  logo_url text,
  amount integer NOT NULL,
  deposit_amount integer NOT NULL,
  stripe_session_id text,
  stripe_payment_intent_id text,
  status public.bid_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT (id, spot_id, company, amount, status, created_at) ON public.bids TO anon, authenticated;
GRANT ALL ON public.bids TO service_role;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Confirmed bid history is public" ON public.bids FOR SELECT TO anon, authenticated USING (status <> 'pending');

CREATE INDEX bids_spot_id_idx ON public.bids(spot_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER sponsor_spots_updated_at BEFORE UPDATE ON public.sponsor_spots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bids_updated_at BEFORE UPDATE ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sponsor_spots REPLICA IDENTITY FULL;
ALTER TABLE public.bids REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_spots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;

INSERT INTO public.sponsor_spots (key_code, label, tier, base_price, current_price, status, sponsor_name) VALUES
('Space','Spacebar','spacebar',1500,2400,'taken','Postiz'),
('Enter','Enter','enter_shift',500,760,'taken','see.io'),
('ShiftLeft','Left Shift','enter_shift',500,500,'open',NULL),
('ShiftRight','Right Shift','enter_shift',500,620,'taken','PrivateAlps'),
('Tab','Tab','enter_shift',500,500,'open',NULL),
('Backspace','Backspace','enter_shift',500,500,'open',NULL),
('KeyA','A','home_row',350,410,'taken','SurfOffice'),
('KeyS','S','home_row',350,350,'open',NULL),
('KeyD','D','home_row',350,375,'taken','Draftline'),
('KeyF','F','home_row',350,350,'open',NULL),
('KeyG','G','home_row',350,350,'open',NULL),
('KeyH','H','home_row',350,350,'open',NULL),
('KeyJ','J','home_row',350,350,'open',NULL),
('KeyK','K','home_row',350,370,'taken','Moyai'),
('KeyL','L','home_row',350,350,'open',NULL),
('Escape','Esc','accent',250,290,'taken','clipory.app'),
('F1','F1','accent',250,250,'open',NULL),
('F2','F2','accent',250,250,'open',NULL),
('F3','F3','accent',250,250,'open',NULL),
('F4','F4','accent',250,250,'open',NULL),
('Digit1','1','accent',250,250,'open',NULL),
('Digit2','2','accent',250,250,'open',NULL),
('Digit3','3','accent',250,265,'taken','FelynGo'),
('Digit4','4','accent',250,250,'open',NULL),
('Digit5','5','accent',250,250,'open',NULL),
('KeyQ','Q','accent',250,250,'open',NULL),
('KeyW','W','accent',250,250,'open',NULL),
('KeyE','E','accent',250,250,'open',NULL),
('KeyR','R','accent',250,250,'open',NULL),
('KeyZ','Z','accent',250,250,'open',NULL),
('KeyX','X','accent',250,250,'open',NULL),
('KeyC','C','accent',250,280,'taken','Vedic Astrology'),
('KeyV','V','accent',250,250,'open',NULL);

INSERT INTO public.bids (spot_id, bidder_name, bidder_email, company, amount, deposit_amount, status, created_at)
SELECT s.id, 'Seed Bidder', 'seed@example.com', s.sponsor_name, v.amount, (v.amount * 0.2)::int, v.status::public.bid_status, now() - (v.ago || ' hours')::interval
FROM public.sponsor_spots s
JOIN (VALUES
  ('Space', 1800, 'outbid', 40),
  ('Space', 2100, 'outbid', 22),
  ('Space', 2400, 'active', 3),
  ('Enter', 600, 'outbid', 30),
  ('Enter', 760, 'active', 6),
  ('ShiftRight', 620, 'active', 12),
  ('KeyA', 410, 'active', 18),
  ('KeyD', 375, 'active', 26),
  ('KeyK', 370, 'active', 9),
  ('Escape', 290, 'active', 31),
  ('Digit3', 265, 'active', 15),
  ('KeyC', 280, 'active', 20)
) AS v(key_code, amount, status, ago) ON v.key_code = s.key_code;