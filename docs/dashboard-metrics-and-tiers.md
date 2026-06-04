# Dashboard Metrics & Tiers (canonical reference)

> Single source of truth for the business dashboard. The segment classifier, the broadcast
> gating, and every "active" label all cite this file. If a number, threshold, or gate
> changes, change it **here first**, then update the code that cites it. Nothing computes
> these concepts independently.
>
> Cited by: `web/src/lib/customer-segments.ts`, `backend/app/api/routes/broadcasts.py`,
> `backend/app/core/features.py`.
> Related: `web/docs/dashboard-achievements.md` (the dashboard home layout + gamification).
> Last updated: 2026-06-03.
>
> **Change (2026-06):** the dashboard home no longer hosts the insight cards or a
> server-side segment classifier. The `dashboard_customer_segments` / `get_business_insights`
> RPC (dev-only migrations 93/94) was removed; segmentation is **client-side only** via
> `web/src/lib/customer-segments.ts`, consumed by the Clients page and broadcast targeting.
> The dashboard home was reworked into a command center, see `dashboard-achievements.md`.

---

## 0. The two trust rules this doc enforces

1. **Numbers agree across pages.** The same concept yields the same number on the
   dashboard, the Clients page, and the Activité page, because they all read one
   server-side computation, not a client-side count over a partial page.
2. **One term, one concept.** "Active" used to mean three things. It now means exactly
   one (active customers), and the card and template senses get their own words.

---

## 1. The "active" vocabulary (locked)

| Concept | EN label | FR label | Definition | Source | Grain |
|---|---|---|---|---|---|
| Cards held in a wallet | Installed cards | Cartes installées | Customers with at least one pass currently installed (net of removals) | Card-lifecycle transactions: latest of `card_added` / `card_re_added` / `card_deleted` per customer, counted unless the latest is `card_deleted` (cross Apple + Google). Exposed as `active_cards` from `get_activity_stats`. | **Per customer**, never per device |
| Recently engaged customer | Active customers | Clients actifs | Customers with **any** transaction (stamp, point, or redemption) in the last **30 days** | `enrollments.last_activity_at >= now - 30d` | Per customer |
| The live card design | Active card style | Style de carte actif | The template currently live | `card_designs.is_active = true` | Per business (one today, see section 6) |
| Install rate | Install rate | Taux d'installation | `Installed cards / Issued cards` | derived | Always 0 to 100% |

Notes that prevent the old drift:

- **Issued cards** (`Cartes émises`) = total customers who have ever been issued a card.
  It is the denominator of install rate. Because both sides are per customer, the rate
  cannot exceed 100%, even when a customer reinstalls on two devices.
- **There is no `passes.installation_status` column.** Installed cards is derived from the
  card-lifecycle transaction stream (above); `push_registrations` is Apple-only and is not
  the source. If a dedicated install-state table is introduced later, update this cell and
  keep the per-customer grain.
- **Do not** source `Clients actifs` from `enrollments.status = 'active'`. That enum means
  "enrollment not completed, paused, or expired," which is a program state, not recency.
  Use `last_activity_at`.
- **"Stamped" is too narrow.** Activity includes redemptions (a redemption is a visit) and
  points (points programs never "stamp"). Always measure activity from `last_activity_at`,
  which is written by every transaction type.
- Internal field name for Installed cards is `active_cards` (already returned by
  `get_activity_stats`). The internal name is fine; the **label** is "Installed cards" /
  "Cartes installées" so the word "active" never appears on a card metric.

---

## 2. Customer segments (single source of truth)

Every segment number anywhere (the Clients page chips and broadcast targeting) is derived
from **one** classifier, `classifyCustomer` in `web/src/lib/customer-segments.ts`, which
assigns each customer to **exactly one** segment using fixed precedence. No page recomputes
membership with its own ad hoc filter.

> The server-side mirror of this classifier (`dashboard_customer_segments` /
> `get_business_insights`) was removed in 2026-06 along with the dashboard insight cards.
> The predicates below remain the spec for the client-side `customer-segments.ts`. If a
> server-side classifier is reintroduced (e.g. for segment-named broadcast targeting at
> scale), it must mirror these predicates exactly.

### 2.1 Precedence (first match wins)

```
close_to_reward  ->  new  ->  ghost  ->  at_risk  ->  vip  ->  regular
```

Because the chain is exclusive, a customer who is both one stamp from a reward **and**
inactive is classified `close_to_reward`, not `at_risk`. This is the property that makes
the cards reconcile: a customer is counted in one segment only.

### 2.2 Segment predicates

`active design` below means the single live `card_designs` row (`is_active = true`);
`gap = total_stamps - stamps`.

| Segment | Predicate | Threshold constant |
|---|---|---|
| `close_to_reward` | `0 < gap <= CLOSE_GAP` | `CLOSE_GAP = 2` (locked) |
| `new` | account age `<= NEW_DAYS` (`customers.created_at >= now - NEW_DAYS`) | `NEW_DAYS` |
| `ghost` | `stamps = 0` and (inactive `>= GHOST_DAYS` or never active) | `GHOST_DAYS` |
| `at_risk` | `stamps > 0` and inactive `>= 30d` | `30d` (locked, = the active window) |
| `vip` | redemptions or lifetime value `>= VIP_THRESHOLD`, and active | `VIP_THRESHOLD` |
| `regular` | everyone else (active, some engagement) | default bucket |

**Locked:** `CLOSE_GAP = 2`, and `at_risk` uses the same **30 day** window as
`Clients actifs`, so "at risk" is by definition a slice of "not active." `NEW_DAYS`,
`GHOST_DAYS`, and `VIP_THRESHOLD` are the values **already in
`web/src/lib/customer-segments.ts`**. Read them from there and keep the RPC identical.
Do not hardcode a second copy. If you change one, change it in this table and in
`customer-segments.ts` in the same commit.

### 2.3 Rollup to the three user-facing chips

The Clients page shows three chips. The dashboard segment-mix view uses the **same three**
so the two pages never show different vocabularies. Confirm the existing rollup in
`customer-segments.ts` and reuse it verbatim; the intended mapping is:

| Chip | EN | Rolls up |
|---|---|---|
| Nouveau | New | `new` |
| Régulier | Regular | `regular` + `vip` + `close_to_reward` |
| Fantôme | Ghost | `ghost` + `at_risk` |

The two dedicated dashboard cards expose finer segments by name, each a documented subset:

- **Near a reward** card = `close_to_reward`, a subset of Régulier.
- **Slipping** card = `at_risk`, a subset of Fantôme.

So "Slipping: 8" on the dashboard and "Fantôme: 12" on the Clients page do not contradict;
Fantôme is `ghost (4) + at_risk (8)`. The relationship is exact because both come from the
one classifier.

### 2.4 Why this resolves the double count

Earlier draft had the near-reward card and the slipping card each running their own raw
filter, so a customer who was one stamp away **and** lapsed appeared in **both** counts and
would receive both broadcasts. Under single-source precedence that customer is
`close_to_reward` only. The cards are filtered **views** of the one classification, never
independent queries.

---

## 3. Insight cards: see / act / depth matrix

> **Relocated (2026-06):** these insight cards were removed from the dashboard home (replaced
> by the achievements widget, see `dashboard-achievements.md`). The at-risk / near-reward
> segments are surfaced on the Clients page. The see / act / depth tier treatment below still
> governs wherever they appear (Clients page chips and the broadcast presets in §4.2).

The rule: **see** the insight on every tier, **act** at Growth, **depth** at Pro.

| Card | Starter (see) | Growth (act) | Pro (depth) |
|---|---|---|---|
| Near a reward (`close_to_reward`) | count + names | one-tap "rappel récompense" broadcast (preset `near_reward`) | save as reusable segment, schedule |
| Slipping (`at_risk`) | count, action shows a `Growth` lock tag | one-tap win-back broadcast (preset `win_back`) | custom inactivity windows, scheduled or automated |
| Segment mix | teaser (one headline count) | teaser or basic | full distribution + per-location split + trend |

Treatment rules:

- **See is free because it costs nothing and sells the upgrade.** A Starter shop reading
  "8 clients décrochent" understands the value before the paywall.
- **The lock tag** is the existing `TIER_RANK` / gated-feature affordance. Starter shows the
  count with a `Growth` tag on the action button, not a hidden card.
- **Segment mix depth** is gated by `analytics.advanced` (Pro), not by the segmentation
  feature key. It is an analytics view, not a targeting capability. The per-customer chips
  (Nouveau / Régulier / Fantôme) stay free on every tier; "depth = Pro" means the
  **aggregate** distribution, per-location split, and trend only, never the labels.

---

## 4. Broadcast filter tier map (after variant B)

Variant B moves `inactive_days` and the `stamp_count` range down to Growth so the win-back
and near-reward actions work at Growth. Pro keeps the rest of the wall.

| Filter key | Tier | Feature key |
|---|---|---|
| `all` | Growth, Pro | `notifications.broadcast` (basic) |
| `enrolled_before_days` | Growth, Pro | basic |
| `enrolled_after_days` | Growth, Pro | basic |
| `segment` (named: `at_risk`, `close_to_reward`, …) | **Growth, Pro** | `notifications.segmentation_basic` (new) |
| `inactive_days` | **Growth, Pro** | `notifications.segmentation_basic` |
| `stamp_count_min` | **Growth, Pro** | `notifications.segmentation_basic` |
| `stamp_count_max` | **Growth, Pro** | `notifications.segmentation_basic` |
| `has_redeemed` | Pro | `notifications.segmentation` (full) |
| location filters | Pro | full |
| multi-dimension combinations | Pro | full |
| `scheduled_at` | Pro | `notifications.scheduled` |

Growth stays capped at 3 broadcasts per month, immediate only, so the Growth/Pro line holds.

### 4.1 Validation: count dimensions, not keys

`_validate_target_filter` runs three levels: basic (`broadcast`), growth-basic
(`segmentation_basic`), full (`segmentation`). The rule that makes near-reward work at
Growth:

> A `min` and a `max` on the **same dimension** (for example `stamp_count_min` +
> `stamp_count_max`) is **one** filter, a range. A "multi-filter combination" means filters
> across **two or more distinct dimensions** (for example `stamp_count` **and**
> `inactive_days`), which requires **full** segmentation (Pro). A single named `segment` is
> one dimension.

So:

- `{stamp_count_min, stamp_count_max}` -> one dimension -> allowed at Growth. ✅
- `{inactive_days}` -> one dimension -> allowed at Growth. ✅
- `{segment: 'at_risk'}` -> one dimension -> allowed at Growth. ✅
- `{stamp_count_min, inactive_days}` -> two dimensions -> Pro only. 🔒
- `{all: true}` remains mutually exclusive with every other key (existing rule, returns 400
  if mixed).

### 4.2 Action presets

Insight-card actions deep-link the broadcast wizard with the audience prefilled. They use
**segment-named** targeting so the audience equals the count shown on the card:

- `?preset=win_back` -> `{ segment: 'at_risk' }`
- `?preset=near_reward` -> `{ segment: 'close_to_reward' }`

The backend resolves `{segment}` via the same `classify_customer_segment` used for the
counts. (Raw `inactive_days` / `stamp_count` ranges remain available for manual wizard use
at Growth, but the card presets target by segment so they reconcile exactly.)

---

## 5. Trends: what is real now

| Metric | WoW trend available now | Source |
|---|---|---|
| Stamps this week | Yes | `transactions`, `[14d, 7d)` vs `[7d, now)` |
| Rewards this week | Yes | `transactions` |
| New customers this week | Yes | `customers.created_at` |
| Total customers | Yes (reconstructable) | `count(created_at <= T)`; no snapshot needed unless customers are hard-deleted |
| Install rate | **No** | needs a daily snapshot table we do not keep yet; show as a level until then |
| Repeat rate | **No** | `get_business_achievements.repeat_rate`; no prior-week baseline computed, so the dashboard KPI shows a level (no arrow), same honesty rule as install rate |

Install rate and repeat rate genuinely need the deferred snapshot baseline. Everything else
has a real week-over-week delta today.

---

## 6. Forward-compatibility caveats

- **Single active design assumption.** Sections 2 and 4 read `total_stamps` from the one
  live design. This holds for Starter and Growth. **Pro supports multiple active templates
  simultaneously**, and **points programs have no `total_stamps`** at all (both on the
  roadmap). `close_to_reward`, the near-reward preset, and any per-design segment math must
  be revisited when multi-active-program or points ship, which is exactly when segment depth
  gets the most use. Until then the RPC scores each customer against **their own enrollment's
  program** `total_stamps`, and this is a known, documented limitation for points, not a
  silent bug.
- **Points variant.** When points launch, "near a reward" becomes "within X points of the
  next reward threshold," a different computation. Add a points branch to the classifier and
  the preset rather than overloading the stamp path.

---

## 7. Anti-patterns (do not do these)

- Counting passes per device for install rate (breaks the 0 to 100% guarantee).
- Sourcing `Clients actifs` from `enrollments.status = 'active'`.
- Measuring activity as "stamped" instead of any transaction via `last_activity_at`.
- Recomputing a segment with a card-local raw filter instead of reading `classifyCustomer`.
- Treating a `stamp_count` range as a multi-filter combination in validation.
- Gating the per-customer segment chips behind Pro (only the aggregate view is Pro).
- Writing "coming soon" for the roadmap items; use a real window per the copywriting skill.
