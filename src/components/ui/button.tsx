import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-[var(--stamp-terracotta)] text-white shadow-sm hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border-2 border-[var(--border)] bg-transparent hover:bg-[var(--muted)] hover:border-[var(--muted-foreground)]",
        secondary:
          "border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)]",
        ghost: "hover:bg-[var(--accent-muted)] hover:text-[var(--accent)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
