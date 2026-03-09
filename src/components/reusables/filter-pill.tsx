interface FilterPillProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  activeColor?: string;
  activeBg?: string;
}

const DEFAULT_ACTIVE_COLOR = "var(--accent)";
const DEFAULT_ACTIVE_BG = "var(--accent-light)";

export function FilterPill({
  label,
  count,
  isActive,
  onClick,
  activeColor = DEFAULT_ACTIVE_COLOR,
  activeBg = DEFAULT_ACTIVE_BG,
}: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium cursor-pointer font-[inherit] whitespace-nowrap transition-colors"
      style={
        isActive
          ? {
              border: `1.5px solid ${activeColor}`,
              background: activeBg,
              color: activeColor,
              fontWeight: 600,
              padding: "5px 12px",
            }
          : {
              border: "1px solid #DEDBD5",
              background: "#fff",
              color: "#777",
              fontWeight: 400,
              padding: "5px 12px",
            }
      }
    >
      {label}
      {count !== undefined && (
        <span style={{ color: isActive ? activeColor : "#BBB", fontSize: 10 }}>
          ({count})
        </span>
      )}
    </button>
  );
}
