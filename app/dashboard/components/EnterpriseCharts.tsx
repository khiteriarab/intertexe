/** Pure SVG visualizations — server-safe, no external chart library. */

type Segment = { key: string; label: string; value: number; color: string };

function polarToCartesian(cx: number, cy: number, radius: number, angleRad: number) {
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function EntPassportLifecycleChart({
  segments,
  centerLabel,
  centerValue,
  size = 300,
  strokeWidth = 32,
}: {
  segments: Segment[];
  centerLabel: string;
  centerValue: string;
  size?: number;
  strokeWidth?: number;
}) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2 - 4;
  let cumulative = 0;

  const arcs =
    total > 0
      ? segments
          .filter((seg) => seg.value > 0)
          .map((seg) => {
            const startAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
            cumulative += seg.value;
            const endAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
            const gap = 0.02;
            return {
              key: seg.key,
              path: describeArc(cx, cy, radius, startAngle + gap, endAngle - gap),
              color: seg.color,
            };
          })
      : [];

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={strokeWidth} />
        {arcs.map((arc) => (
          <path
            key={arc.key}
            d={arc.path}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ))}
        {total === 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={strokeWidth}
            strokeDasharray="4 12"
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <p className="ent-display ent-serif text-[3.25rem] md:text-[3.75rem] leading-none text-white">{centerValue}</p>
        <p className="text-[11px] tracking-[0.14em] uppercase text-white/55 mt-2 max-w-[8rem]">{centerLabel}</p>
      </div>
    </div>
  );
}

export function EntStackedBarChart({
  rows,
  dark = false,
}: {
  rows: Array<{ label: string; value: number; color: string }>;
  dark?: boolean;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (total === 0) {
    return <div className={`h-3 rounded-full ${dark ? "bg-white/10" : "bg-[var(--ent-surface-muted)]"}`} />;
  }
  return (
    <div className="space-y-3">
      <div
        className={`flex h-3 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-[var(--ent-surface-muted)]"}`}
      >
        {rows.map((row) =>
          row.value > 0 ? (
            <div
              key={row.label}
              className="h-full transition-all duration-700"
              style={{ width: `${(row.value / total) * 100}%`, backgroundColor: row.color, minWidth: "4px" }}
            />
          ) : null
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} aria-hidden />
            <span className={`truncate ${dark ? "text-white/70" : "text-[var(--ent-ink-soft)]"}`}>{row.label}</span>
            <span className={`ml-auto tabular-nums ${dark ? "text-white/50" : "text-[var(--ent-muted)]"}`}>
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const LIFECYCLE_COLORS = {
  published: "#2c4a3e",
  ready: "#42666c",
  review_required: "#b8b0a6",
  incomplete: "rgba(154, 148, 140, 0.45)",
  update_required: "#9e4a5a",
  archived: "rgba(154, 148, 140, 0.3)",
} as const;
