CREATE OR REPLACE FUNCTION public.get_leaderboard()
 RETURNS TABLE(user_id uuid, user_email text, item_count bigint, score bigint)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;