const colors: Record<string, { bg: string; text: string }> = {
  completed: { bg: "var(--success-muted)", text: "var(--success)" },
  failed: { bg: "var(--error-muted)", text: "var(--error)" },
  processing: { bg: "var(--warning-muted)", text: "var(--warning)" },
  pending: { bg: "var(--bg-tertiary)", text: "var(--text-muted)" },
  queued: { bg: "var(--bg-tertiary)", text: "var(--text-muted)" },
  running: { bg: "var(--warning-muted)", text: "var(--warning)" },
};

export default function StatusBadge({ status }: { status: string }) {
  const color = colors[status] || colors.pending;

  return (
    <span style={{
      display: "inline-block",
      padding: "3px 8px",
      background: color.bg,
      color: color.text,
      fontSize: "11px",
      fontWeight: 500,
      borderRadius: "4px",
    }}>
      {status}
    </span>
  );
}
