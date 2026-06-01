"use client";

import { useCallback, useRef, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface SeriesPoint {
  date: string;
  label?: string;
  count: number;
  revenue: number;
}

function pointLabel(point: SeriesPoint) {
  return point.label ?? format(new Date(point.date), "d MMM yyyy");
}

function ChartTooltip({
  primary,
  secondary,
  leftPct,
}: {
  primary: string;
  secondary: string;
  leftPct: number;
}) {
  return (
    <div
      className="pointer-events-none absolute bottom-full z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: `${leftPct}%` }}
    >
      <p className="font-semibold text-foreground">{primary}</p>
      <p className="text-muted-foreground">{secondary}</p>
    </div>
  );
}

export function TrendAreaChart({
  data,
  valueKey,
  className,
  formatValue,
}: {
  data: SeriesPoint[];
  valueKey: "count" | "revenue";
  className?: string;
  formatValue?: (point: SeriesPoint) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

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

  const pickIndex = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || n === 0) return null;
      if (n === 1) return 0;
      const ratio = (clientX - rect.left) / rect.width;
      return Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
    },
    [n]
  );

  const handleMove = (e: React.MouseEvent) => {
    setActive(pickIndex(e.clientX));
  };

  const handleLeave = () => setActive(null);

  const activePoint = active != null ? data[active] : null;
  const activeY = active != null ? points[active][1] : 0;
  const leftPct = active != null && n > 1 ? (active / (n - 1)) * 100 : 50;
  const topPct = (activeY / H) * 100;

  return (
    <div
      ref={containerRef}
      className="relative h-32 w-full cursor-crosshair"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {activePoint && (
        <>
          <ChartTooltip
            primary={formatValue ? formatValue(activePoint) : String(activePoint[valueKey])}
            secondary={pointLabel(activePoint)}
            leftPct={leftPct}
          />
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px -translate-x-1/2 bg-primary/35"
            style={{ left: `${leftPct}%` }}
          />
          <div
            className="pointer-events-none absolute z-10 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background"
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          />
        </>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={cn("h-full w-full text-primary", className)}
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
    </div>
  );
}

export function TrendBarChart({
  data,
  className,
  formatValue,
}: {
  data: SeriesPoint[];
  className?: string;
  formatValue?: (point: SeriesPoint) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const n = data.length;

  const activePoint = active != null ? data[active] : null;
  const leftPct = active != null && n > 1 ? (active / (n - 1)) * 100 : 50;

  return (
    <div className="relative h-32 w-full">
      {activePoint && (
        <ChartTooltip
          primary={formatValue ? formatValue(activePoint) : String(activePoint.revenue)}
          secondary={pointLabel(activePoint)}
          leftPct={leftPct}
        />
      )}

      <div className={cn("flex h-full items-end gap-px text-primary", className)}>
        {data.map((d, i) => {
          const pct = (d.revenue / max) * 100;
          const isActive = active === i;
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 items-end"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <div
                className={cn(
                  "w-full cursor-pointer rounded-t-sm bg-current transition-opacity",
                  isActive ? "opacity-100" : "opacity-70"
                )}
                style={{ height: `${pct}%`, minHeight: d.revenue > 0 ? 3 : 0 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
