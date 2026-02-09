"use client";

interface SortableColumnHeaderProps {
  label: string;
  field: string;
  currentSort: string;
  currentDirection: "asc" | "desc";
  onSort: (field: string) => void;
  style?: React.CSSProperties;
}

export default function SortableColumnHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
  style,
}: SortableColumnHeaderProps) {
  const isActive = currentSort === field;

  return (
    <button
      onClick={() => onSort(field)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        background: "none",
        border: "none",
        padding: "0",
        fontSize: "11px",
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: isActive ? "var(--text-primary)" : "var(--text-muted)",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
      {isActive && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: currentDirection === "asc" ? "rotate(180deg)" : undefined,
            transition: "transform 150ms cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  );
}
