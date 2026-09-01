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

export function EntDonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 260,
  strokeWidth = 28,
  light = true,
}: {
  segments: Segment[];
  centerLabel: string;
  centerValue: string;
  size?: number;
  strokeWidth?: number;
  light?: boolean;
}) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2 - 4;
  let cumulative = 0;
  const track = light ? "rgba(62, 98, 104, 0.08)" : "rgba(255,255,255,0.12)";

  const arcs =
    total > 0
      ? segments
          .filter((seg) => seg.value > 0)
          .map((seg) => {
            const startAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
            cumulative += seg.value;
            const endAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
            const gap = 0.015;
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
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={track} strokeWidth={strokeWidth} />
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
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
        <p
          className={`ent-display ent-serif leading-none ${light ? "text-[var(--ent-ink)]" : "text-white"}`}
          style={{ fontSize: size * 0.18 }}
        >
          {centerValue}
        </p>
        <p
          className={`text-[10px] tracking-[0.12em] uppercase mt-2 max-w-[7rem] ${light ? "text-[var(--ent-muted)]" : "text-white/55"}`}
        >
          {centerLabel}
        </p>
      </div>
    </div>
  );
}

export function EntStackedBarChart({
  rows,
  dark = false,
  tall = false,
}: {
  rows: Array<{ label: string; value: number; color: string }>;
  dark?: boolean;
  tall?: boolean;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (total === 0) {
    return (
      <div
        className={`${tall ? "h-5" : "h-3"} rounded-full ${dark ? "bg-white/10" : "bg-[var(--ent-surface-muted)]"}`}
      />
    );
  }
  return (
    <div className="space-y-4">
      <div
        className={`flex ${tall ? "h-5" : "h-3"} rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-white/60 ring-1 ring-[var(--ent-border)]"}`}
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
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} aria-hidden />
            <span className={`truncate ${dark ? "text-white/75" : "text-[var(--ent-ink-soft)]"}`}>{row.label}</span>
            <span className={`ml-auto tabular-nums font-medium ${dark ? "text-white/60" : "text-[var(--ent-muted)]"}`}>
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EntRadialActivityChart({
  rows,
  size = 200,
}: {
  rows: Array<{ label: string; value: number; color: string }>;
  size?: number;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const segments = rows.map((row, index) => ({
    key: row.label,
    label: row.label,
    value: row.value,
    color: row.color,
  }));
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: size }}>
        <p className="text-sm text-[var(--ent-muted)]">No activity recorded</p>
      </div>
    );
  }
  return (
    <EntDonutChart
      segments={segments}
      centerValue={String(total)}
      centerLabel="Recent events"
      size={size}
      strokeWidth={22}
      light
    />
  );
}

export const LIFECYCLE_COLORS = {
  published: "#2c4a3e",
  ready: "#42666c",
  review_required: "#b8b0a6",
  incomplete: "rgba(154, 148, 140, 0.55)",
  update_required: "#9e4a5a",
  archived: "rgba(154, 148, 140, 0.35)",
} as const;

export const ACTIVITY_COLORS = {
  imports: "#42666c",
  publishes: "#2c4a3e",
  updates: "#b8b0a6",
  reviews: "#9e4a5a",
  other: "rgba(154, 148, 140, 0.5)",
} as const;

export const ISSUE_COLORS = {
  open: "#9e4a5a",
  resolved: "#2c4a3e",
  missing: "#42666c",
  conflicts: "#b8b0a6",
} as const;
