import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type InfoBoxVariant = "info" | "success" | "error" | "warning" | "note";

const VARIANT_STYLES: Record<
  InfoBoxVariant,
  { container: string; title: string; text: string }
> = {
  info: {
    container: "bg-[var(--info-light)] border-[var(--info)]/30",
    title: "text-[var(--info)]",
    text: "text-[var(--info)]",
  },
  success: {
    container: "bg-[var(--success-light)] border-[var(--success)]/30",
    title: "text-[var(--success)]",
    text: "text-[var(--success)]",
  },
  error: {
    container: "bg-[var(--error-light)] border-[var(--error)]/30",
    title: "text-[var(--error)]",
    text: "text-[var(--error)]",
  },
  warning: {
    container: "bg-[#FFF8F0] border-[#F0DFC0]",
    title: "text-[var(--warning)]",
    text: "text-[#A08060]",
  },
  note: {
    container: "bg-[var(--paper)] border-[var(--border-light)]",
    title: "text-[#8A8A8A]",
    text: "text-[#8A8A8A]",
  },
};

interface InfoBoxProps {
  variant?: InfoBoxVariant;
  icon?: ReactNode;
  title?: string;
  message: ReactNode;
  className?: string;
}

export function InfoBox({
  variant = "info",
  icon,
  title,
  message,
  className,
}: InfoBoxProps) {
  const styles = VARIANT_STYLES[variant];

  if (icon || title) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 p-3.5 rounded-lg border",
          styles.container,
          className
        )}
      >
        {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
        <div>
          {title && (
            <div className={cn("text-[13px] font-semibold mb-0.5", styles.title)}>
              {title}
            </div>
          )}
          <div className={cn("text-[12px] leading-[1.4]", styles.text)}>
            {message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border text-sm",
        styles.container,
        styles.text,
        className
      )}
    >
      {message}
    </div>
  );
}
