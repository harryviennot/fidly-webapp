interface StatCardSmallProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  highlight?: boolean;
}

export const StatCardSmall = ({ icon, label, value, subtext, highlight }: StatCardSmallProps) => {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${highlight
        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]"
        : "border-[var(--border)] bg-[var(--cream)]"
        }`}
    >
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-lg ${highlight
          ? "bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]"
          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
          }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
        <p className="text-sm text-[var(--muted-foreground)] truncate">
          {label}
        </p>
      </div>
      {subtext && (
        <p className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
          {subtext}
        </p>
      )}
    </div>
  );
}