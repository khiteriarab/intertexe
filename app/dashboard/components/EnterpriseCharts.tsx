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
        <p className="ent-display text-[3.25rem] md:text-[3.75rem] leading-none text-white">{centerValue}</p>
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
          className={`ent-display leading-none ${light ? "text-[var(--ent-ink)]" : "text-white"}`}
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

/** Smooth gradient area chart from current distribution values (not historical). */
export function EntAreaChart({
  rows,
  height = 160,
  gradientId = "ent-area-grad",
  dark = false,
}: {
  rows: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  gradientId?: string;
  dark?: boolean;
}) {
  const width = 400;
  const padding = { top: 12, right: 8, bottom: 8, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const points = rows.map((row, i) => {
    const x = padding.left + (rows.length <= 1 ? innerW / 2 : (i / (rows.length - 1)) * innerW);
    const y = padding.top + innerH - (row.value / max) * innerH;
    return { x, y, ...row };
  });

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-[var(--ent-muted)]" style={{ height }}>
        No data
      </div>
    );
  }

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`;
  const stroke = dark ? "rgba(255,255,255,0.85)" : "#42666c";
  const gradStart = dark ? "rgba(255,255,255,0.35)" : "rgba(158, 74, 90, 0.4)";
  const gradEnd = dark ? "rgba(255,255,255,0.02)" : "rgba(66, 102, 108, 0.05)";

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradStart} />
            <stop offset="100%" stopColor={gradEnd} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="4" fill={dark ? "#fff" : p.color || "#42666c"} opacity={dark ? 0.9 : 1} />
        ))}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {rows.map((row) => (
          <li key={row.label} className={`text-[11px] ${dark ? "text-white/60" : "text-[var(--ent-muted)]"}`}>
            {row.label} <span className="tabular-nums font-medium">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Rounded vertical bars (Crextio-style). */
export function EntRoundedBarChart({
  rows,
  height = 140,
  dark = false,
}: {
  rows: Array<{ label: string; value: number; color: string }>;
  height?: number;
  dark?: boolean;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex items-end justify-between gap-2 md:gap-3" style={{ height }}>
      {rows.map((row) => {
        const pct = Math.max(8, (row.value / max) * 100);
        return (
          <div key={row.label} className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <div
              className="w-full rounded-t-[var(--ent-radius-lg)] transition-all duration-700"
              style={{
                height: `${pct}%`,
                background: row.color,
                minHeight: row.value > 0 ? "12px" : "4px",
                opacity: dark ? 0.95 : 1,
              }}
            />
            <span className={`text-[10px] truncate w-full text-center ${dark ? "text-white/55" : "text-[var(--ent-muted-light)]"}`}>
              {row.label.split(" ")[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Progress ring for KPI highlights. */
export function EntProgressRing({
  value,
  max = 100,
  label,
  size = 120,
  accent = "#e8c547",
}: {
  value: number;
  max?: number;
  label: string;
  size?: number;
  accent?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const stroke = 10;
  const radius = (size - stroke) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(62,98,104,0.1)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="ent-display text-2xl leading-none text-[var(--ent-ink)]">{pct}%</p>
        <p className="text-[10px] text-[var(--ent-muted)] mt-1 max-w-[4.5rem] leading-tight">{label}</p>
      </div>
    </div>
  );
}
