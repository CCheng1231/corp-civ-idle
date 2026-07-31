interface CompactStackLine {
  label: string;
  value: string;
  valueClassName?: string;
}

interface CompactStackProps {
  heading: string;
  lines: CompactStackLine[];
  className?: string;
  note?: string;
}

export function CompactStack({
  heading,
  lines,
  className = "",
  note,
}: CompactStackProps) {
  if (lines.length === 0) return null;

  return (
    <div className={["compact-stack", className].filter(Boolean).join(" ")}>
      <span className="compact-stack-heading">{heading}</span>
      <ul className="compact-stack-list">
        {lines.map((line) => (
          <li key={line.label} className="compact-stack-line">
            <span className="compact-stack-label">{line.label}:</span>{" "}
            <span className={line.valueClassName}>{line.value}</span>
          </li>
        ))}
      </ul>
      {note ? <span className="compact-stack-note">{note}</span> : null}
    </div>
  );
}

export function formatCompactCost(value: number): string {
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000;
    return `${scaled % 1 === 0 ? scaled : scaled.toFixed(1)}m`;
  }
  if (value >= 1_000) {
    const scaled = value / 1_000;
    return `${scaled % 1 === 0 ? scaled : scaled.toFixed(1)}k`;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(0);
}
