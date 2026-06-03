# web/ — guidance for Claude

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
