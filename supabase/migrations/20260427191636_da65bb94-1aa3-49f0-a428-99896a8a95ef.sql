UPDATE public.products SET xp_cost = CASE LOWER(name)
  WHEN 'earrings' THEN 800
  WHEN 'keychain' THEN 1200
  WHEN 'bookmark' THEN 1500
  WHEN 'tea coasters' THEN 6000
  WHEN 'paperweight' THEN 7500
  WHEN 'pen holder' THEN 10000
  WHEN 'bookshelf' THEN 18000
  WHEN 'clock' THEN 35000
  ELSE xp_cost
END
WHERE LOWER(name) IN ('earrings','keychain','bookmark','tea coasters','paperweight','pen holder','bookshelf','clock');