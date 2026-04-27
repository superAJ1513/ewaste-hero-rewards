## Goal

Boost rewards for high-value e-waste only, and re-tier product prices so Premium sits just below Trophy.

## XP per submission (`supabase/functions/detect-ewaste/index.ts`)

Only three categories change. Everything else (battery, chargers, mouse, keyboard, light, misc_small, earphones/headphones, misc_big) stays exactly as-is.

| Category | Current | New |
|---|---|---|
| Phone / Speaker | 800 | **2,500** ↑ |
| Tablet | 3,000 | **6,000** ↑ |
| Laptop | 5,000 | **12,000** ↑ |
| Misc big | contact only, 0 XP | **unchanged — keeps contact number** |
| Earphones / Headphones | 650 | **650** (unchanged) |
| All others | — | unchanged |

## Product prices (`products` table)

Three tiers, with Premium pushed up to sit just below Trophy.

| Product | Current | New | Tier |
|---|---|---|---|
| Earrings | 300 | **800** | Accessible |
| Keychain | 400 | **1,200** | Accessible |
| Bookmark | 450 | **1,500** | Accessible |
| Tea Coasters | 600 | **6,000** | Premium |
| Paperweight | 500 | **7,500** | Premium |
| Pen Holder | 800 | **10,000** | Premium |
| Bookshelf | 1,000 | **18,000** | Trophy |
| Clock | 2,800 | **35,000** | Flagship Trophy |

Reasoning:
- **Accessible (800–1,500)**: a phone drop or a few chargers gets you here — keeps the dopamine loop alive.
- **Premium (6,000–10,000)**: a tablet, or a phone + a few accessories. Now clearly above Accessible and just below Trophy.
- **Trophy (18,000–35,000)**: requires a laptop drop (or two) plus extras. The Clock is the headline brag piece.

## UI: tier badges (`src/routes/shop.tsx`)

Add a small badge to each product card derived client-side from `xp_cost`:
- `< 6,000` → "Accessible"
- `6,000–14,999` → "Premium"
- `≥ 15,000` → "Trophy"

Uses existing neon tokens (lime/cyan/magenta) so it fits the current visual language.

## Files changed

1. `supabase/functions/detect-ewaste/index.ts` — bump three XP values in `CATEGORY_XP`.
2. DB migration — `UPDATE products SET xp_cost = ...` for all 8 rows.
3. `src/routes/shop.tsx` — add tier badge component on each card.

No other code paths reference these XP numbers directly.
