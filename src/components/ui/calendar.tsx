"use client"

import * as React from "react"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/**
 * Thin wrapper around react-day-picker v9 that matches the shadcn look
 * against the project's existing design tokens (var(--accent), border,
 * muted-foreground, etc.). Keep it simple — no custom components slots.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        ...defaultClassNames,
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex flex-col sm:flex-row gap-2 relative",
          defaultClassNames.months
        ),
        month: cn("flex flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center justify-between absolute inset-x-0 top-0 z-10",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "size-7 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "size-7 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex justify-center h-7 items-center text-sm font-medium",
          defaultClassNames.month_caption
        ),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        day: cn(
          "h-9 w-9 p-0 text-center text-sm relative",
          defaultClassNames.day
        ),
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:opacity-100 disabled:pointer-events-none disabled:opacity-50",
          defaultClassNames.day_button
        ),
        selected: cn(
          "[&>button]:bg-[var(--accent)] [&>button]:text-white [&>button]:hover:bg-[var(--accent)] [&>button]:hover:text-white [&>button]:focus:bg-[var(--accent)] [&>button]:focus:text-white",
          defaultClassNames.selected
        ),
        today: cn(
          "[&>button]:bg-muted/60 [&>button]:text-foreground",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground/50 aria-selected:text-muted-foreground/80",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground/50 opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...chevronProps }) => {
          if (orientation === "left") {
            return (
              <CaretLeftIcon
                className={cn("h-4 w-4", chevronClass)}
                {...chevronProps}
              />
            )
          }
          return (
            <CaretRightIcon
              className={cn("h-4 w-4", chevronClass)}
              {...chevronProps}
            />
          )
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
