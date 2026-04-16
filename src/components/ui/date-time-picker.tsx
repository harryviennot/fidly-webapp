"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarBlankIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value: Date | null
  onChange: (value: Date | null) => void
  /** Earliest allowed full date (inclusive). Defaults to today. */
  minDate?: Date
  /** Earliest allowed hour on the minDate day (inclusive). */
  hourMin?: number
  /** Latest allowed hour overall (inclusive). */
  hourMax?: number
  /** Disable the whole control. */
  disabled?: boolean
  /** Optional aria label for the date trigger button. */
  ariaLabel?: string
  /** Optional display hint under the control (e.g. timezone label). */
  hint?: React.ReactNode
}

const TIME_STEP_MINUTES = 5

function buildHourOptions(min: number, max: number): number[] {
  const out: number[] = []
  for (let h = min; h <= max; h++) out.push(h)
  return out
}

function buildMinuteOptions(): number[] {
  const out: number[] = []
  for (let m = 0; m < 60; m += TIME_STEP_MINUTES) out.push(m)
  return out
}

/**
 * Date + time picker for scheduled broadcasts.
 *
 * Combines shadcn `Popover` + `Calendar` for the date and two `Select`s
 * for the hour / minute in 15-minute increments. Enforces a sliding hour
 * window via `hourMin`/`hourMax` (default 9–20 to mirror the broadcast
 * scheduling window on the backend).
 */
export function DateTimePicker({
  value,
  onChange,
  minDate,
  hourMin = 0,
  hourMax = 23,
  disabled = false,
  ariaLabel,
  hint,
}: Readonly<DateTimePickerProps>) {
  const [open, setOpen] = React.useState(false)

  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const effectiveMinDate = minDate ?? today

  const hourOptions = React.useMemo(
    () => buildHourOptions(hourMin, hourMax),
    [hourMin, hourMax]
  )
  const minuteOptions = React.useMemo(() => buildMinuteOptions(), [])

  // Pull the current hour/minute off the value (or default to first valid slot)
  const hour = value?.getHours() ?? hourMin
  const minute = value?.getMinutes() ?? 0

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const next = new Date(date)
    next.setHours(hour, minute, 0, 0)
    onChange(next)
    setOpen(false)
  }

  const handleHourChange = (hourStr: string) => {
    const nextHour = parseInt(hourStr, 10)
    const base = value ? new Date(value) : new Date(effectiveMinDate)
    base.setHours(nextHour, minute, 0, 0)
    onChange(base)
  }

  const handleMinuteChange = (minuteStr: string) => {
    const nextMinute = parseInt(minuteStr, 10)
    const base = value ? new Date(value) : new Date(effectiveMinDate)
    base.setHours(hour, nextMinute, 0, 0)
    onChange(base)
  }

  const dateLabel = value ? format(value, "EEE, MMM d, yyyy") : "Pick a date"

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              aria-label={ariaLabel}
              className={cn(
                "min-w-[220px] justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarBlankIcon className="h-4 w-4" />
              {dateLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value ?? undefined}
              onSelect={handleDateSelect}
              disabled={(d) => d < effectiveMinDate}
              autoFocus
            />
          </PopoverContent>
        </Popover>

        <Select
          value={String(hour)}
          onValueChange={handleHourChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[90px] !py-2 !rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {hourOptions.map((h) => (
              <SelectItem key={h} value={String(h)}>
                {h.toString().padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground">:</span>

        <Select
          value={String(minute)}
          onValueChange={handleMinuteChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[90px] !py-2 !rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {minuteOptions.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m.toString().padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
