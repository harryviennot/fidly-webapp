# Dashboard & Achievements (canonical reference)

> What the business dashboard home is for, which data points live where, and how the
> gamification (achievements + weekly goal) works. Metric definitions are not duplicated
> here: they live in `dashboard-metrics-and-tiers.md` and this doc cross-links to them.
>
> Cited by: `backend/database/migrations/95_dashboard_achievements.sql`,
> `web/src/lib/achievements.ts`, `web/src/lib/weekly-goal.ts`,
> `web/src/components/redesign/achievements-widget.tsx`,
> `web/src/app/(dashboard)/page.tsx`, `web/src/app/(dashboard)/achievements/page.tsx`.
> Related: `dashboard-metrics-and-tiers.md`.
> Last updated: 2026-06-03.

---

## 1. What the dashboard is for

> When an owner opens Stampeo, in about 5 seconds they should know: is my program healthy
> and growing, what just happened, and feel rewarded for their progress so they come back.
> It is a **command center, not a data warehouse.**

Two consequences:

1. **The home shows only the essentials.** Operational depth (the full activity log, the
   customer table, per-customer history) lives on its own page. The dashboard never tries
   to be the analytics surface.
2. **It does not adapt itself into three different layouts.** The previous lifecycle staging
   (empty / early / established) and the momentum and insight cards were removed. There is
   **one** layout for everyone; it degrades gracefully at zero because the achievements
   "first customer / first reward" rungs double as the empty-state motivator.

---

## 2. Information architecture (where every data point lives)

| Surface | Role | Data |
|---|---|---|
| **Dashboard** (`/`) | Curated command center | 4-KPI grid, a peek at recent activity, the active-card widget, quick actions, and the **achievements + weekly-goal widget** |
| **Achievements** (`/achievements`) | Gamification detail | The full trophy catalog grouped by category (earned / in-progress / locked) |
| **Analytics** (deferred, not built) | Deep exploration | Trends over time, stamp heatmap (day x hour), repeat-rate over time, density, dormant cohorts, reward-redemption rate, location leaderboard (Pro = advanced) |
| **Activity** (`/activity`) | Operational live log | Unchanged: today's operational stats + the full transaction feed |
| **Customers** (`/customers`) | Customer management + segments | Unchanged: the segment chips and per-customer table (segmentation stays client-side) |
| **Program** (`/program`) | Program config & assets | Unchanged: card style, signup URL/QR, settings |

**Delegation rule.** At-risk and near-reward guidance is **not** on the dashboard home. Those
segments already exist on the Clients page (`web/src/lib/customer-segments.ts`); the dashboard
links there rather than duplicating them. This is why the old `InsightCard` / `OneThingToday`
were removed.

---

## 3. Dashboard data points

The 4 KPIs (balanced grid, no single hero). Definitions are owned by
`dashboard-metrics-and-tiers.md`; do not redefine them here.

| KPI | Value | Trend | Source |
|---|---|---|---|
| Total customers | cumulative count | WoW (prior baseline reconstructed from `new_customers_this_week`) | `useCustomers` + `get_activity_stats` |
| Installed cards | `active_cards` | install-rate subtitle (`active / total`), no arrow | `get_activity_stats` |
| Stamps this week | `stamps_this_week` | WoW vs `stamps_prev_week`, today's count as subtitle | `get_activity_stats` |
| Repeat rate | `repeat_rate` x 100 | **level only** (no prior-week baseline exists, do not fabricate one) | `get_business_achievements` |

Below the grid: a 5-row **recent-activity peek** (`RecentScans`) that links to `/activity`.
Right rail: the **achievements widget** (top), the active-card widget, quick actions.

---

## 4. Gamification

### 4.1 Achievements (ladders + one-time badges)

Config and resolver live in `web/src/lib/achievements.ts` (pure, no React). Every threshold
is defined there once; the UI only formats labels via i18n (`messages/{en,fr}/achievements.json`).
Early rungs are deliberately tiny so a new shop unlocks something fast.

- **Growth, Customers** (`total_customers`): 1, 5, 10, 25, 50, 100, 200, 500, 1000, 2500, 5000
- **Engagement, Stamps** (`total_stamps_given`): 1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 25000, 100000
- **This month, Stamps in 30 days** (`stamps_last_30d`): 10, 25, 50, 100, 250, 500, 1000, 2500, 5000
- **This month, New customers in 30 days** (`new_customers_last_30d`): 5, 10, 25, 50, 100, 250, 500
- **Loyalty, Returning customers** (`repeat_customers`, a **count**, not a percentage): 1, 5, 10, 25, 50, 100, 250, 500, 1000
- **Firsts (one-time)**: `first_reward` (`total_rewards_redeemed >= 1`), `first_broadcast`
  (`businesses.settings.first_broadcast_sent`)

**Why repeat rate is a count, not a percentage.** A repeat-*rate* percentage re-locks and reads
as "100%" for a single twice-stamped customer, and 100% is not a realistic target. Returning
**customers** (visited on >=2 distinct days) is an honest, always-achievable count.

**The "This month" category is rolling and sticky.** It rewards sustained recent effort rather
than lifetime stacking. Because a rolling window naturally falls, these trophies are made
**sticky**: `computeAchievements(values, seenKeys)` treats any key already in
`settings.achievements_seen` as permanently unlocked, so a quiet month never un-earns a trophy.
Stickiness applies to all ladders (a harmless no-op for monotonic lifetime ones).

The widget shows the **current goal per ladder** (lowest unmet rung), the three closest to
completion, so there is always an "almost there" target. Setup/adoption badges are deliberately
excluded: that belongs to the onboarding checklist. A rewards ladder is an easy future add (the
RPC already returns `total_rewards_redeemed`).

All counters come from `get_business_achievements` (migration 95). "Stamps given" counts
`type = 'stamp_added'` only, so a trophy total always agrees with the dashboard StatCards.

**Page display (suspense without overwhelm).** `achievementsForDisplay` shows, per ladder, every
earned rung + the current goal clearly, the rung right after it **blurred** (a teaser so the
owner knows another challenge exists), and **hides** everything beyond. Each category has a
clickable `InfoPopover` (`web/src/components/reusables/info-popover.tsx`, touch-friendly)
explaining its metric; the weekly goal carries one too (it answers "of what?": stamps).

### 4.2 Weekly goal (smart auto, editable)

Logic in `web/src/lib/weekly-goal.ts`.

- **Baseline** = average of the trailing 4 complete weeks' stamps (the RPC returns 5 complete
  weeks via `weekly_stamp_series`, current partial week excluded).
- **Auto target** = `max(10, roundToNearest5(baseline))`. New / no-history → starter 10.
- **Override** = `businesses.settings.weekly_goal` (owner edits inline). null / absent = auto.
- **Framing is always positive.** "{remaining} to go" when under, "Goal reached" when at/over.
  Never a "down X%". A slow week must never read as failure (see `feedback_momentum_stats`).
- Resets on the same week boundary the RPC uses, `date_trunc('week', CURRENT_DATE)` (Monday
  00:00, **server TZ / UTC**, same as `stamps_this_week`).

### 4.3 Celebration (in-app now)

When a computed-earned key is absent from `settings.achievements_seen`, the widget pops a
Sonner toast and a "New" badge, then writes the key into `achievements_seen` so it fires
once. On the **very first load** (`achievements_seen` never set), the baseline is seeded
silently so already-earned trophies never pop retroactively; only future unlocks celebrate.

### 4.4 Fast-follow: unlock emails (not built)

A server-side unlock email/push to pull an absent owner back. The `achievements_seen` ledger
is forward-compatible: the email job tracks its own emailed-set and reuses the same
achievement definitions. Adding it requires no rework here. A stored `unlocked_at` (needed
for exact per-achievement unlock dates on the page) would land with that work.

---

## 5. Adaptation (current scope)

The dashboard is intentionally **non-adaptive** for now: one layout for every business,
every tier, single or multi-location. Deferred, in order of likely value:

- **Plan + locations**: a Pro location dimension and soft upsell teasers toward the future
  advanced analytics; single vs multi-location layout.
- **Business type**: copy and peer benchmarks ("cafés like yours average X"), which need an
  anonymized cross-business RPC and a privacy review. `settings.business_type` already exists
  (today only seeds onboarding defaults).

---

## 6. Deferred Analytics page (defined, not built)

The home delegates deep exploration to a future Analytics page. The menu, with what each
needs:

| View | Needs |
|---|---|
| Trends over time (signups, stamps, rewards) | `get_admin_timeseries` already accepts a `business_id` scope |
| Stamp heatmap (day x hour) | new per-business RPC |
| Repeat-rate over time | new per-business RPC (snapshot or windowed) |
| Density (stamps / customer) | derivable; small RPC |
| Dormant / churn cohorts | new per-business RPC (inverse of the at-risk segment) |
| Reward-redemption rate (rewards / stamps) | derivable from existing counters |
| Location leaderboard | `get /locations/{id}/stats` exists; **Pro = advanced** (`analytics.advanced`) |

The page is Pro-gated for "advanced"; a basic subset can stay free, matching
`backend/app/core/features.py` where advanced analytics is already a Pro concept.

---

## 7. Anti-patterns (do not do these)

- Reintroducing lifecycle staging or the momentum/insight cards on the home.
- Putting charts, heatmaps, or cohort tables on the dashboard home (they belong on Analytics).
- Counting `bonus_stamp` toward "stamps given" (would disagree with the StatCards).
- Showing a fabricated WoW arrow on repeat rate or install rate (no baseline exists).
- Celebrating retroactively-earned trophies on first load (seed `achievements_seen` silently).
- Hardcoding achievement thresholds in a component instead of `web/src/lib/achievements.ts`.
- Daily streaks: wrong rhythm for a B2B owner, and a broken streak risks churn.
