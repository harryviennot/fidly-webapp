"use client"

import {
  CheckCircleIcon,
  InfoIcon,
  SpinnerIcon,
  XCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4" weight="fill" />,
        info: <InfoIcon className="size-4" weight="fill" />,
        warning: <WarningIcon className="size-4" weight="fill" />,
        error: <XCircleIcon className="size-4" weight="fill" />,
        loading: <SpinnerIcon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--cream)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "1rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
