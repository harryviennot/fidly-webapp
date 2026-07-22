# web/ — guidance for Claude

## Testing — write the test first

Per the workspace policy (root `CLAUDE.md`): write the test BEFORE implementing
a feature or change, run it after; when touching untested code, backfill tests
for what you touch. Tests are colocated `*.test.ts` files next to the code
under `src/` and run with Bun's built-in runner:

```bash
bun test src        # also: bun run test
```

Target the pure logic in `src/lib/` first (see `broadcast-filters.test.ts`,
`achievements.test.ts`, `weekly-goal.test.ts`). Extract logic out of components
into `lib/` when it needs testing rather than reaching for a DOM test harness.
`@types/bun` is a devDependency so `bun:test` imports type-check.

## Cards: always use the shared `<Card>`

Any card-shaped surface in `web/` reuses `web/src/components/ui/card.tsx` and its
companions (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`,
`CardFooter`). Do not reach for ad-hoc `<div className="rounded-[12px] border ...">`
divs — they drift over time and produce mixed rounding/borders.

- `<Card>` defaults to `rounded-xl`, `bg-[var(--card)]`, the project's shadow
  and border tokens. That's the look we want everywhere — match it instead of
  rebuilding it.
- Pass `hover={false}` for static / non-clickable surfaces. The default
  `hover` adds a translate-up animation that feels wrong on info cards.
- Pass `flat` for static content cards that must carry **no shadow at all** —
  e.g. the achievement tiles on `/achievements`. `flat` drops the resting
  shadow *and* the hover translate. **Never re-introduce a shadow on a `flat`
  card** via a `shadow-[…]` className override; if a surface is meant to be
  flat, keep it flat.
- Tint variants happen via className overrides on `<Card>` (e.g.
  `bg-[var(--accent-light)]/40`), not via new wrappers.

If you find yourself writing `rounded-[12px]` or `rounded-[16px]` with a border
in a feature file, that's the signal to swap in `<Card>` before continuing.

## Components in general

`web/src/components/{ui,dashboard,reusables}/` already covers most surfaces —
buttons, alerts/info-boxes, dialogs, dropdowns, inputs, etc. Check the
existing kit before adding a new component. If you need something cross-
cutting that doesn't exist, build it generic and drop it under `ui/` or
`reusables/`.

Notable reusables:

- **`InfoPopover`** (`reusables/info-popover.tsx`) — a small "i" info bubble for
  explaining a metric, field, or term. Device-adaptive: **hover to view** on
  mouse / fine-pointer devices (a real `Tooltip`), **tap to view** on touch (a
  `Popover`, since hover tooltips never fire on touch). Both wear the base
  Tooltip style. Pass `content` (string or node), optional `label`/`side`/`align`.
  Reach for this for any "what is this / tell me more" secondary context.

  **Rule: always use `InfoPopover` for any new tooltip or info bubble.** Never
  hand-roll a raw shadcn `<Tooltip>` as an info bubble — it is hover-only and
  never fires on touch, so phone users never see it. When you come across an
  existing raw-`Tooltip`-as-info-bubble, migrate it to `InfoPopover` (move its
  content into the `content` prop). `StatCard` (`components/redesign`) takes an
  optional `info` prop that renders one next to the title.
