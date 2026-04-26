CREATE OR REPLACE FUNCTION public.get_leaderboard_overall()
 RETURNS TABLE(user_id uuid, user_email text, display_name text, avatar_url text, item_count bigint, lifetime_xp bigint, current_xp bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
  ORDER BY e.lifetime_xp DESC, e.item_count DESC
  LIMIT 100;
$function$;