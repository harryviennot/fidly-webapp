import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-white shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-[var(--success-light)] text-[var(--success-dark)]",
        warning:
          "border-transparent bg-[var(--warning-light)] text-[var(--warning)]",
        error:
          "border-transparent bg-[var(--error-light)] text-[var(--error)]",
        info:
          "border-transparent bg-[var(--info-light)] text-[var(--info)]",
        inactive:
          "border-transparent bg-[var(--inactive-light)] text-[var(--inactive)]",
        pro:
          "border-transparent bg-[var(--success-light)] text-[var(--success)] text-[8px] font-bold tracking-wide",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
