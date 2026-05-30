"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  CalendarClock,
  Stethoscope,
  TrendingUp,
  IndianRupee,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import { ClinicBanner } from "@/components/layout/clinic-banner";
import {
  TrendAreaChart,
  TrendBarChart,
  type SeriesPoint,
} from "@/components/dashboard/trend-charts";
import { format } from "date-fns";

interface PrescriptionPreview {
  id: string;
  createdAt: string;
  followUpDate?: string | null;
  diagnosis: string | null;
  totalAmount: number | null;
  patient: {
    fullName: string;
    age: number;
    gender: string;
  };
}

interface DashboardData {
  todayPatients: number;
  totalConsultations: number;
  pendingFollowUps: number;
  totalPatients: number;
  thisWeekConsultations: number;
  totalRevenue: number;
  avgConsultationFee: number;
  series: SeriesPoint[];
  upcomingFollowUps: PrescriptionPreview[];
  recentPrescriptions: PrescriptionPreview[];
}

const inr = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;

export default function DashboardPage() {
  const { doctor } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const greetingName = doctor?.fullName?.startsWith("Dr.")
    ? doctor.fullName.split(" ").slice(0, 2).join(" ")
    : `Dr. ${doctor?.fullName?.split(" ")[0] ?? ""}`.trim();

  usePageHeader({
    title: `Good ${getGreeting()}, ${greetingName}`,
    description: format(new Date(), "EEEE, MMMM d, yyyy"),
  });

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const dash = (n: number | undefined) => (loading ? "—" : n ?? 0);

  return (
    <div className="space-y-6">
      <ClinicBanner />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={Stethoscope}
          tone="text-primary bg-primary/10"
          label="Today's Patients"
          value={dash(data?.todayPatients)}
        />
        <StatCard
          icon={TrendingUp}
          tone="text-chart-1 bg-chart-1/10"
          label="This Week"
          value={dash(data?.thisWeekConsultations)}
        />
        <StatCard
          icon={FileText}
          tone="text-chart-2 bg-chart-2/10"
          label="Consultations"
          value={dash(data?.totalConsultations)}
        />
        <StatCard
          icon={Users}
          tone="text-chart-3 bg-chart-3/10"
          label="Patients"
          value={dash(data?.totalPatients)}
        />
        <StatCard
          icon={IndianRupee}
          tone="text-chart-4 bg-chart-4/10"
          label="Total Revenue"
          value={loading ? "—" : inr(data?.totalRevenue ?? 0)}
        />
        <StatCard
          icon={CalendarClock}
          tone="text-chart-5 bg-chart-5/10"
          label="Follow-ups"
          value={dash(data?.pendingFollowUps)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Consultations</CardTitle>
              <span className="text-xs text-muted-foreground">Last 30 days</span>
            </div>
            <p className="text-2xl font-bold">
              {loading
                ? "—"
                : (data?.series.reduce((s, d) => s + d.count, 0) ?? 0)}
            </p>
          </CardHeader>
          <CardContent>
            {data && data.series.length > 0 ? (
              <TrendAreaChart data={data.series} valueKey="count" className="text-primary" />
            ) : (
              <div className="h-32" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Revenue</CardTitle>
              <span className="text-xs text-muted-foreground">Last 30 days</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {loading
                  ? "—"
                  : inr(data?.series.reduce((s, d) => s + d.revenue, 0) ?? 0)}
              </p>
              {!loading && (
                <span className="text-xs text-muted-foreground">
                  avg fee {inr(data?.avgConsultationFee ?? 0)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data && data.series.length > 0 ? (
              <TrendBarChart
                data={data.series}
                className="text-chart-4"
                formatTooltip={(d) =>
                  `${format(new Date(d.date), "d MMM")}: ${inr(d.revenue)}`
                }
              />
            ) : (
              <div className="h-32" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Prescriptions</CardTitle>
            <Link href="/prescriptions">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                Loading...
              </p>
            ) : !data?.recentPrescriptions?.length ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No prescriptions yet</p>
                <Link href="/prescriptions/new" className="mt-2 inline-block">
                  <Button variant="link">Create your first prescription</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentPrescriptions.map((rx) => (
                  <Link
                    key={rx.id}
                    href={`/prescriptions/${rx.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                        {rx.patient.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {rx.patient.fullName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {rx.patient.age}y / {rx.patient.gender}
                          {rx.diagnosis && ` — ${rx.diagnosis}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(rx.createdAt), "d MMM, h:mm a")}
                      </p>
                      {rx.totalAmount ? (
                        <Badge variant="secondary" className="mt-1">
                          {inr(rx.totalAmount)}
                        </Badge>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                Loading...
              </p>
            ) : !data?.upcomingFollowUps?.length ? (
              <div className="text-center py-12">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No upcoming follow-ups</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcomingFollowUps.map((rx) => (
                  <Link
                    key={rx.id}
                    href={`/prescriptions/${rx.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-chart-5/10 flex items-center justify-center text-sm font-medium text-chart-5 shrink-0">
                        {rx.patient.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {rx.patient.fullName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {rx.diagnosis || `${rx.patient.age}y / ${rx.patient.gender}`}
                        </p>
                      </div>
                    </div>
                    {rx.followUpDate && (
                      <Badge variant="outline" className="shrink-0 ml-4">
                        {format(new Date(rx.followUpDate), "d MMM")}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string | number;
}) {
  const [fg, bg] = tone.split(" ");
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${bg}`}>
            <Icon className={`h-5 w-5 ${fg}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
