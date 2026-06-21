"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarClock,
  IndianRupee,
  Pill,
  Stethoscope,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageHeader } from "@/contexts/page-header-context";
import { cn } from "@/lib/utils";

type RangeKey = "today" | "week" | "month";

type RankedMetric = {
  label: string;
  count: number;
  percentage: number;
};

type AnalyticsRange = {
  key: RangeKey;
  label: string;
  startsAt: string;
  endsAt: string;
  prescriptions: number;
  uniquePatients: number;
  revenue: number;
  followUps: number;
  diseases: RankedMetric[];
  symptoms: RankedMetric[];
  medicines: RankedMetric[];
  ageGroups: RankedMetric[];
  genderMix: RankedMetric[];
};

type AnalyticsResponse = {
  generatedAt: string;
  ranges: AnalyticsRange[];
};

const RANGE_ORDER: RangeKey[] = ["today", "week", "month"];

const inr = (value: number) =>
  `Rs. ${Math.round(value).toLocaleString("en-IN")}`;

const percent = (value: number) => `${Math.round(value * 100)}%`;

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState<RangeKey>("week");

  usePageHeader({
    title: "Analytics",
    description: "Clinical patterns, patient mix, medicines, and follow-up load",
  });

  useEffect(() => {
    let active = true;
    fetch("/api/analytics/clinical", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load analytics");
        return res.json();
      })
      .then((nextData: AnalyticsResponse) => {
        if (active) setData(nextData);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const ranges = useMemo(() => {
    const byKey = new Map(data?.ranges.map((range) => [range.key, range]));
    return RANGE_ORDER.map((key) => byKey.get(key)).filter(
      Boolean
    ) as AnalyticsRange[];
  }, [data]);

  const active = ranges.find((range) => range.key === activeRange) ?? ranges[0];
  const topDisease = active?.diseases[0];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Stethoscope}
          label="Consultations"
          value={loading ? "..." : active?.prescriptions ?? 0}
          detail={active?.label ?? "Selected range"}
        />
        <MetricCard
          icon={Users}
          label="Patients"
          value={loading ? "..." : active?.uniquePatients ?? 0}
          detail="Unique patients seen"
        />
        <MetricCard
          icon={Activity}
          label="Top Disease"
          value={loading ? "..." : topDisease?.label ?? "No diagnosis"}
          detail={
            topDisease
              ? `${topDisease.count} case${topDisease.count === 1 ? "" : "s"}`
              : "Diagnosis not captured"
          }
        />
        <MetricCard
          icon={IndianRupee}
          label="Revenue"
          value={loading ? "..." : inr(active?.revenue ?? 0)}
          detail={active?.label ?? "Selected range"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {loading
          ? RANGE_ORDER.map((key) => (
              <Card key={key} className="min-h-80">
                <CardHeader>
                  <CardTitle className="text-base">Loading...</CardTitle>
                </CardHeader>
              </Card>
            ))
          : ranges.map((range) => (
              <DiseaseFrequencyCard key={range.key} range={range} />
            ))}
      </section>

      {active && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Detailed View
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatRange(active.startsAt, active.endsAt)}
              </p>
            </div>
            <div className="inline-flex w-fit items-center rounded-lg border bg-muted/40 p-0.5">
              {ranges.map((range) => (
                <button
                  key={range.key}
                  type="button"
                  aria-pressed={activeRange === range.key}
                  onClick={() => setActiveRange(range.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    activeRange === range.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MetricListCard
              icon={Activity}
              title="Symptoms"
              empty="No symptoms captured"
              rows={active.symptoms}
            />
            <MetricListCard
              icon={Pill}
              title="Medicines"
              empty="No medicines prescribed"
              rows={active.medicines}
            />
            <MetricListCard
              icon={Users}
              title="Age Groups"
              empty="No patient age data"
              rows={active.ageGroups}
            />
            <MetricListCard
              icon={BarChart3}
              title="Gender Mix"
              empty="No gender data"
              rows={active.genderMix}
            />
          </div>

          <Card>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
              <InlineMetric
                icon={CalendarClock}
                label="Follow-ups Scheduled"
                value={active.followUps}
              />
              <InlineMetric
                icon={Stethoscope}
                label="Consultations"
                value={active.prescriptions}
              />
              <InlineMetric
                icon={IndianRupee}
                label="Average Revenue"
                value={
                  active.prescriptions
                    ? inr(active.revenue / active.prescriptions)
                    : inr(0)
                }
              />
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function DiseaseFrequencyCard({ range }: { range: AnalyticsRange }) {
  return (
    <Card className="min-h-80">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{range.label}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {range.prescriptions} consultation
              {range.prescriptions === 1 ? "" : "s"}
            </p>
          </div>
          <Badge variant="secondary">{formatRangeShort(range.startsAt, range.endsAt)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {range.diseases.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No diagnoses captured
          </div>
        ) : (
          <div className="space-y-4">
            {range.diseases.map((disease, index) => (
              <div key={disease.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <p className="truncate font-medium">{disease.label}</p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {disease.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(4, disease.percentage * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {percent(disease.percentage)} of consultations
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricListCard({
  icon: Icon,
  title,
  empty,
  rows,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  empty: string;
  rows: RankedMetric[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{row.label}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {row.count}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-chart-2"
                    style={{ width: `${Math.max(4, row.percentage * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-2xl font-bold">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InlineMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function formatRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  end.setDate(end.getDate() - 1);
  return `${start.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} - ${end.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function formatRangeShort(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  end.setDate(end.getDate() - 1);
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }
  return `${start.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  })} - ${end.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  })}`;
}
