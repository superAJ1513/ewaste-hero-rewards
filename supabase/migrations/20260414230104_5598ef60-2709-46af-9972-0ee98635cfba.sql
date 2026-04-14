
-- Drop the insecure view
DROP VIEW IF EXISTS public.leaderboard;

-- Create a secure function instead
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  item_count BIGINT,
  score BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.user_id,
    u.email::text as user_email,
    COUNT(s.id) as item_count,
    COUNT(s.id) * 200 as score
  FROM public.ewaste_submissions s
  JOIN auth.users u ON u.id = s.user_id
  GROUP BY s.user_id, u.email
  ORDER BY item_count DESC
  LIMIT 50;
$$;

-- Restrict storage SELECT policy to not allow listing
DROP POLICY IF EXISTS "Public can view ewaste photos" ON storage.objects;
CREATE POLICY "Public can view specific ewaste photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ewaste-photos' AND name IS NOT NULL);
