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
| Total stamps | `total_stamps_given` (lifetime) | `+{stamps_this_week} this week` subtitle, no arrow | `get_business_achievements` |
| Total rewards | `total_rewards_redeemed` (lifetime) | level only | `get_business_achievements` |
| Loyal customers | `loyal_customers_6m` | level only, `active last 6 months` subtitle | `get_business_achievements` (migration 97) |

**Loyalty is defined two ways on purpose.** The dashboard KPI uses `loyal_customers_6m`
(>=2 distinct stamp-days in the **last 6 months**) — "currently loyal", because someone who
came twice years ago and never returned is not loyal today. The loyalty **trophy** uses the
lifetime `repeat_customers` (>=2 distinct stamp-days **ever**), which must stay monotonic so a
trophy never re-locks. Keep them separate.

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
  (`businesses.settings.first_broadcast_sent`), `owner_uses_app` (`owner_used_native_app`),
  `team_uses_app` (`all_employees_use_native_app`)

**App-adoption trophies (STA-174).** Two one-time badges reward moving the team off the web
scanner onto the native iOS/Android app: `owner_uses_app` (the owner has at least one native
scan) and `team_uses_app` (every active, non-paused scanner member has a native scan). Both read
the **per-membership** `memberships.platforms_used` list (migration 98), so a business is only
credited for native scans done *there* — no cross-business leak. "Native" means `ios`/`android`;
a `web`-only scanner has not earned it. The signal is fed by `record_scan_platform()`, called on
every stamp from the platform the scanner-app reports via the `X-Client-Platform` header (dashboard
manual adjustments send no header, so they never count). A global `users.platforms_used` mirror
exists for platform-wide "how many people use the app" analytics.

**Why repeat rate is a count, not a percentage.** A repeat-*rate* percentage re-locks and reads
as "100%" for a single twice-stamped customer, and 100% is not a realistic target. Returning
**customers** (visited on >=2 distinct days) is an honest, always-achievable count.

**The "This month" category is rolling and sticky.** It rewards sustained recent effort rather
than lifetime stacking. Because a rolling window naturally falls, these trophies are made
**sticky**: `computeAchievements(values, ledger)` treats any key already recorded in the
`business_achievements` ledger (see §4.3) as permanently unlocked, so a quiet month never
un-earns a trophy. Stickiness applies to all ladders (a harmless no-op for monotonic lifetime
ones).

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

### 4.3 The unlock ledger (`business_achievements`, migration 96)

The old `settings.achievements_seen: text[]` array is replaced by a real per-business
ledger: `business_achievements (business_id, achievement_key, unlocked_at, acknowledged_at)`.
It carries WHEN each trophy was earned (for "Earned · 2 days ago" + the "Recently earned"
strip) and whether its unlock has been celebrated yet (`acknowledged_at`). Its recorded
keys also feed `computeAchievements(values, ledger)` for stickiness, the role the old array
played. Detection stays client-computed; the server only records what the client reports.

**The `__init__` sentinel** is the persistent "this business has been seeded" marker. Table
emptiness alone can't tell an established shop's first visit (suppress every already-earned
trophy) from a brand-new shop earning its genuine first one (celebrate it) — both can have
an empty ledger. The sentinel lives in the table (not owner-only settings), so it works no
matter which member opens the dashboard first. Migration 96 backfills existing
`achievements_seen` arrays as already-acknowledged rows + a sentinel, so nothing re-pops.

**Flow (unlock → animate → acknowledge):**
1. The client computes `unlockedKeys` from the counters and `POST .../achievements/sync`s
   them. First contact (no sentinel) seeds the sentinel + every key as already-acknowledged
   (silent). Later calls insert genuinely new keys with `acknowledged_at = NULL`.
2. `AchievementCelebration` (mounted once in `web/src/app/(dashboard)/layout.tsx`) shows the
   centered "unlocked" moment for any `acknowledged_at == null` rows — a distinct, game-like
   animation (scale-in bounce + ray fan + particle burst + shine sweep), **not** the hover
   coin flip. It queues multiple unlocks and points at the next action via the CTA.
3. On dismiss it `POST .../achievements/acknowledge`s the batch, so a trophy celebrates
   exactly once and never re-fires. The endpoints are `require_any_access` + idempotent.

`useAchievementSync` (the writer, used only by the overlay) and `useComputedAchievements`
(read-only, used by the widget + page) are the single source — nothing reads
`achievements_seen` anymore.

### 4.4 Fast-follow: unlock emails (not built)

A server-side unlock email/push to pull an absent owner back. The `business_achievements`
table is forward-compatible: server-side detection (firing on stamp/customer/reward/broadcast
writes) would insert rows directly, and the email job can track its own emailed flag beside
`acknowledged_at`. `unlocked_at` already gives exact per-achievement dates.

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
