
-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Drop and recreate leaderboard functions with new return shape
DROP FUNCTION IF EXISTS public.get_leaderboard_overall();
DROP FUNCTION IF EXISTS public.get_leaderboard_weekly();
DROP FUNCTION IF EXISTS public.get_leaderboard_monthly();

CREATE FUNCTION public.get_leaderboard_overall()
 RETURNS TABLE(user_id uuid, user_email text, display_name text, avatar_url text, item_count bigint, lifetime_xp bigint, current_xp bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH earned AS (
    SELECT s.user_id, COUNT(s.id)::bigint AS item_count,
           COALESCE(SUM(s.xp_awarded),0)::bigint AS lifetime_xp
    FROM public.ewaste_submissions s GROUP BY s.user_id
  ),
  spent AS (
    SELECT r.user_id, COALESCE(SUM(r.xp_cost),0)::bigint AS spent_xp
    FROM public.redemptions r WHERE r.status <> 'cancelled' GROUP BY r.user_id
  )
  SELECT e.user_id, u.email::text AS user_email, p.display_name, p.avatar_url,
         e.item_count, e.lifetime_xp,
         (e.lifetime_xp - COALESCE(s.spent_xp,0)) AS current_xp
  FROM earned e
  JOIN auth.users u ON u.id = e.user_id
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN spent s ON s.user_id = e.user_id
  ORDER BY current_xp DESC, e.lifetime_xp DESC
  LIMIT 100;
$function$;

CREATE FUNCTION public.get_leaderboard_weekly()
 RETURNS TABLE(user_id uuid, user_email text, display_name text, avatar_url text, item_count bigint, score bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.user_id, u.email::text AS user_email, p.display_name, p.avatar_url,
         COUNT(s.id)::bigint AS item_count,
         COALESCE(SUM(s.xp_awarded),0)::bigint AS score
  FROM public.ewaste_submissions s
  JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE s.created_at >= date_trunc('week', now())
  GROUP BY s.user_id, u.email, p.display_name, p.avatar_url
  ORDER BY score DESC LIMIT 100;
$function$;

CREATE FUNCTION public.get_leaderboard_monthly()
 RETURNS TABLE(user_id uuid, user_email text, display_name text, avatar_url text, item_count bigint, score bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.user_id, u.email::text AS user_email, p.display_name, p.avatar_url,
         COUNT(s.id)::bigint AS item_count,
         COALESCE(SUM(s.xp_awarded),0)::bigint AS score
  FROM public.ewaste_submissions s
  JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE s.created_at >= date_trunc('month', now())
  GROUP BY s.user_id, u.email, p.display_name, p.avatar_url
  ORDER BY score DESC LIMIT 100;
$function$;
