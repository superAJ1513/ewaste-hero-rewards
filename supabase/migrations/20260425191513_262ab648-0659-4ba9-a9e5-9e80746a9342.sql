
-- 1. Update ewaste_submissions to track per-item XP
ALTER TABLE public.ewaste_submissions
  ADD COLUMN IF NOT EXISTS xp_awarded integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS detected_label text,
  ADD COLUMN IF NOT EXISTS confidence numeric;

-- Backfill: existing rows already default to 200, no change needed.

CREATE INDEX IF NOT EXISTS idx_ewaste_submissions_user_created
  ON public.ewaste_submissions(user_id, created_at DESC);

-- 2. Products catalog
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  xp_cost integer NOT NULL CHECK (xp_cost > 0),
  description text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (active = true);

INSERT INTO public.products (name, xp_cost, description, sort_order) VALUES
  ('Keychain', 400, 'Upcycled keychain — every piece is unique.', 10),
  ('Earrings', 300, 'Handmade earrings from reclaimed e-waste components.', 20),
  ('Bookmark', 450, 'Sleek bookmark crafted from circuit fragments.', 30),
  ('Paperweight', 500, 'Solid paperweight with embedded tech relics.', 40),
  ('Tea Coasters', 600, 'Set of coasters made from recycled boards.', 50),
  ('Pen Holder', 800, 'Desk pen holder built from upcycled parts.', 60),
  ('Bookshelf', 1000, 'Mini shelf forged from reclaimed e-waste.', 70),
  ('Clock', 2800, 'Functional wall clock — the showpiece of the collection.', 80)
ON CONFLICT DO NOTHING;

-- 3. Redemptions (orders)
CREATE TABLE IF NOT EXISTS public.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  xp_cost integer NOT NULL CHECK (xp_cost > 0),
  ship_name text NOT NULL,
  ship_address text NOT NULL,
  ship_phone text NOT NULL,
  ship_email text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
  ON public.redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own redemptions"
  ON public.redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_redemptions_user ON public.redemptions(user_id, created_at DESC);

-- 4. Drop old leaderboard function and replace with new versions
DROP FUNCTION IF EXISTS public.get_leaderboard();

-- Overall leaderboard: ranked by current spendable XP (lifetime earned - spent)
CREATE OR REPLACE FUNCTION public.get_leaderboard_overall()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  item_count bigint,
  lifetime_xp bigint,
  current_xp bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH earned AS (
    SELECT s.user_id,
           COUNT(s.id)::bigint AS item_count,
           COALESCE(SUM(s.xp_awarded),0)::bigint AS lifetime_xp
    FROM public.ewaste_submissions s
    GROUP BY s.user_id
  ),
  spent AS (
    SELECT r.user_id, COALESCE(SUM(r.xp_cost),0)::bigint AS spent_xp
    FROM public.redemptions r
    WHERE r.status <> 'cancelled'
    GROUP BY r.user_id
  )
  SELECT e.user_id,
         u.email::text AS user_email,
         e.item_count,
         e.lifetime_xp,
         (e.lifetime_xp - COALESCE(s.spent_xp,0)) AS current_xp
  FROM earned e
  JOIN auth.users u ON u.id = e.user_id
  LEFT JOIN spent s ON s.user_id = e.user_id
  ORDER BY current_xp DESC, e.lifetime_xp DESC
  LIMIT 100;
$$;

-- Weekly: XP earned in current ISO week
CREATE OR REPLACE FUNCTION public.get_leaderboard_weekly()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  item_count bigint,
  score bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id,
         u.email::text AS user_email,
         COUNT(s.id)::bigint AS item_count,
         COALESCE(SUM(s.xp_awarded),0)::bigint AS score
  FROM public.ewaste_submissions s
  JOIN auth.users u ON u.id = s.user_id
  WHERE s.created_at >= date_trunc('week', now())
  GROUP BY s.user_id, u.email
  ORDER BY score DESC
  LIMIT 100;
$$;

-- Monthly: XP earned in current calendar month
CREATE OR REPLACE FUNCTION public.get_leaderboard_monthly()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  item_count bigint,
  score bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id,
         u.email::text AS user_email,
         COUNT(s.id)::bigint AS item_count,
         COALESCE(SUM(s.xp_awarded),0)::bigint AS score
  FROM public.ewaste_submissions s
  JOIN auth.users u ON u.id = s.user_id
  WHERE s.created_at >= date_trunc('month', now())
  GROUP BY s.user_id, u.email
  ORDER BY score DESC
  LIMIT 100;
$$;

-- Per-user stats including tier rank by lifetime XP percentile
CREATE OR REPLACE FUNCTION public.get_user_stats(_user_id uuid)
RETURNS TABLE (
  lifetime_xp bigint,
  current_xp bigint,
  item_count bigint,
  weekly_xp bigint,
  monthly_xp bigint,
  tier text,
  rank_position bigint,
  total_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lifetime bigint := 0;
  v_spent bigint := 0;
  v_items bigint := 0;
  v_weekly bigint := 0;
  v_monthly bigint := 0;
  v_rank bigint := 0;
  v_total bigint := 0;
  v_tier text := 'Rookie';
  v_percentile numeric := 1.0;
BEGIN
  SELECT COALESCE(SUM(xp_awarded),0), COUNT(*)
    INTO v_lifetime, v_items
  FROM public.ewaste_submissions WHERE user_id = _user_id;

  SELECT COALESCE(SUM(xp_cost),0) INTO v_spent
  FROM public.redemptions WHERE user_id = _user_id AND status <> 'cancelled';

  SELECT COALESCE(SUM(xp_awarded),0) INTO v_weekly
  FROM public.ewaste_submissions
  WHERE user_id = _user_id AND created_at >= date_trunc('week', now());

  SELECT COALESCE(SUM(xp_awarded),0) INTO v_monthly
  FROM public.ewaste_submissions
  WHERE user_id = _user_id AND created_at >= date_trunc('month', now());

  -- Total users with at least one submission
  SELECT COUNT(DISTINCT user_id) INTO v_total FROM public.ewaste_submissions;

  IF v_total > 0 AND v_lifetime > 0 THEN
    -- Rank position by lifetime XP (1 = best)
    SELECT rnk INTO v_rank FROM (
      SELECT user_id, RANK() OVER (ORDER BY SUM(xp_awarded) DESC) AS rnk
      FROM public.ewaste_submissions
      GROUP BY user_id
    ) t WHERE t.user_id = _user_id;

    v_percentile := v_rank::numeric / v_total::numeric;

    IF v_percentile <= 0.01 THEN v_tier := 'Grandmaster';
    ELSIF v_percentile <= 0.08 THEN v_tier := 'Legendary';
    ELSIF v_percentile <= 0.15 THEN v_tier := 'Master';
    ELSIF v_percentile <= 0.25 THEN v_tier := 'Pro';
    ELSIF v_percentile <= 0.50 THEN v_tier := 'Veteran';
    ELSE v_tier := 'Rookie';
    END IF;
  END IF;

  RETURN QUERY SELECT v_lifetime, (v_lifetime - v_spent), v_items, v_weekly, v_monthly, v_tier, v_rank, v_total;
END;
$$;

-- Helper: get current spendable XP for a user (used by redeem function)
CREATE OR REPLACE FUNCTION public.get_current_xp(_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT SUM(xp_awarded) FROM public.ewaste_submissions WHERE user_id = _user_id), 0)::bigint
    -
    COALESCE((SELECT SUM(xp_cost) FROM public.redemptions WHERE user_id = _user_id AND status <> 'cancelled'), 0)::bigint;
$$;
