"use client";

import { cn } from "@/lib/utils";

export interface SeriesPoint {
  date: string;
  label?: string;
  count: number;
  revenue: number;
}

export function TrendAreaChart({
  data,
  valueKey,
  className,
}: {
  data: SeriesPoint[];
  valueKey: "count" | "revenue";
  className?: string;
}) {
  const values = data.map((d) => d[valueKey]);
  const max = Math.max(1, ...values);
  const W = 100;
  const H = 36;
  const n = values.length;
  const stepX = n > 1 ? W / (n - 1) : 0;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = H - (v / max) * (H - 4) - 2;
    return [x, y] as const;
  });

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const gradId = `trend-grad-${valueKey}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("h-32 w-full text-primary", className)}
      role="img"
      aria-label="Trend chart"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TrendBarChart({
  data,
  className,
  formatTooltip,
}: {
  data: SeriesPoint[];
  className?: string;
  formatTooltip?: (point: SeriesPoint) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.revenue));

  return (
    <div className={cn("flex h-32 items-end gap-px text-primary", className)}>
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        return (
          <div
            key={i}
            title={formatTooltip ? formatTooltip(d) : undefined}
            className="flex-1 rounded-t-sm bg-current opacity-70 transition-opacity hover:opacity-100"
            style={{ height: `${pct}%`, minHeight: d.revenue > 0 ? 3 : 0 }}
          />
        );
      })}
    </div>
  );
}
