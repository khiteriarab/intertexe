/**
 * Safe period comparisons for founder pulse metrics.
 * Never invents % changes when prior is zero or either side is missing.
 */

export type PeriodDelta = {
  current: number | null;
  previous: number | null;
  absolute: number | null;
  /** Null when % would be misleading (missing data or prior == 0). */
  percent: number | null;
  label: string | null;
  complete: boolean;
};

export function computePeriodDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  opts?: { periodLabel?: string }
): PeriodDelta {
  const periodLabel = opts?.periodLabel || "vs prior period";
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return {
      current: current == null || !Number.isFinite(Number(current)) ? null : Number(current),
      previous: previous == null || !Number.isFinite(Number(previous)) ? null : Number(previous),
      absolute: null,
      percent: null,
      label: "comparison incomplete",
      complete: false,
    };
  }
  const absolute = current - previous;
  if (absolute === 0) {
    return {
      current,
      previous,
      absolute: 0,
      percent: 0,
      label: `flat ${periodLabel}`,
      complete: true,
    };
  }
  if (previous === 0) {
    const sign = absolute > 0 ? "+" : "";
    return {
      current,
      previous,
      absolute,
      percent: null,
      label: `${sign}${absolute.toLocaleString("en-US")} ${periodLabel} (no prior baseline)`,
      complete: true,
    };
  }
  const percent = (absolute / Math.abs(previous)) * 100;
  const sign = absolute > 0 ? "+" : "";
  const pctSign = percent > 0 ? "+" : "";
  return {
    current,
    previous,
    absolute,
    percent,
    label: `${sign}${absolute.toLocaleString("en-US")} (${pctSign}${percent.toFixed(0)}%) ${periodLabel}`,
    complete: true,
  };
}

export function formatPeriodDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  opts?: { periodLabel?: string }
): string | null {
  return computePeriodDelta(current, previous, opts).label;
}
