"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  PlusCircle,
  FileText,
  Sparkles,
  Stethoscope,
  CalendarClock,
  CalendarCheck,
  CalendarDays,
  HeartPulse,
  Phone,
  User,
  Weight,
  Activity,
  TriangleAlert,
  Droplet,
  ArrowUpDown,
  Pill,
  ExternalLink,
} from "lucide-react";
import { usePageHeader } from "@/contexts/page-header-context";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  reasonLabel,
  durationLabel,
  severityLabel,
  reasonChipClasses,
  severityChipClasses,
  buildVisitSymptoms,
} from "@/lib/queue-options";
import type { LabReportData, QueueEntryData } from "@/types";
import { ConsultationDoneButton } from "@/components/queue/consultation-done-button";

interface Prescription {
  id: string;
  createdAt: string;
  diagnosis: string | null;
  symptoms: string | null;
  advice: string | null;
  followUpDate: string | null;
  totalAmount: number | null;
  medicines: Array<{ name: string }>;
}

interface PatientDetail {
  id: string;
  fullName: string;
  age: number;
  gender: string;
  phone: string;
  weight: string | null;
  bp: string | null;
  diabetesStatus: string | null;
  allergies: string | null;
  existingConditions: string | null;
  createdAt: string;
  prescriptions: Prescription[];
  labReports: LabReportData[];
}

type SortKey = "newest" | "oldest";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
};

const cleanCondition = (value: string | null) =>
  value && value !== "DEMO_SEED" ? value : null;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
};

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const queueEntryId = searchParams.get("queueEntryId");

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [visit, setVisit] = useState<QueueEntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load patient");
        return res.json();
      })
      .then(setPatient)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!queueEntryId) return;
    fetch(`/api/queue/${queueEntryId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setVisit)
      .catch(() => setVisit(null));
  }, [queueEntryId]);

  const fromQueue = Boolean(queueEntryId);

  usePageHeader({
    title: fromQueue ? "Consultation" : patient?.fullName ?? "Patient",
    description: fromQueue
      ? undefined
      : patient
        ? `${patient.age}y / ${patient.gender} · ${patient.phone}`
        : undefined,
    backHref: fromQueue ? "/queue" : "/patients",
  });

  const prescriptions = useMemo(
    () => patient?.prescriptions ?? [],
    [patient?.prescriptions]
  );
  const labReports = useMemo(() => {
    const byId = new Map<string, LabReportData>();
    patient?.labReports?.forEach((report) => byId.set(report.id, report));
    visit?.labReports?.forEach((report) => byId.set(report.id, report));

    return Array.from(byId.values()).sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
    );
  }, [patient?.labReports, visit?.labReports]);

  const sorted = useMemo(() => {
    const arr = [...prescriptions];
    if (sort === "oldest") {
      return arr.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    }
    return arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [prescriptions, sort]);

  const latestId = useMemo(() => {
    let id: string | null = null;
    let t = -Infinity;
    for (const r of prescriptions) {
      const x = +new Date(r.createdAt);
      if (x > t) {
        t = x;
        id = r.id;
      }
    }
    return id;
  }, [prescriptions]);

  if (loading) {
    return <p className="text-center text-muted-foreground py-12">Loading...</p>;
  }
  if (!patient) {
    return <p className="text-center text-muted-foreground py-12">Patient not found</p>;
  }

  const lastVisit = prescriptions.find((p) => p.id === latestId) ?? null;
  const isNew = prescriptions.length === 0;
  const conditions = cleanCondition(patient.existingConditions);
  const nextFollowUp = lastVisit?.followUpDate
    ? format(new Date(lastVisit.followUpDate), "d MMM yyyy")
    : "None scheduled";

  const newRxHref = visit && queueEntryId
    ? `/prescriptions/new?patientId=${patient.id}&queueEntryId=${queueEntryId}&symptoms=${encodeURIComponent(
        buildVisitSymptoms(visit)
      )}`
    : visit
      ? `/prescriptions/new?patientId=${patient.id}&symptoms=${encodeURIComponent(
          buildVisitSymptoms(visit)
        )}`
      : `/prescriptions/new?patientId=${patient.id}`;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {fromQueue && (
        <div className="rounded-xl border bg-card px-5 py-4 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight">{patient.fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {patient.age}y / {patient.gender} · {patient.phone}
          </p>
        </div>
      )}

      {/* Current visit banner */}
      {visit && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Current Visit
                </span>
                {isNew ? (
                  <Badge className="gap-1 bg-chart-2/15 text-chart-2 hover:bg-chart-2/15">
                    <Sparkles className="h-3 w-3" />
                    New patient
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Returning · {prescriptions.length}{" "}
                    {prescriptions.length === 1 ? "visit" : "visits"}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", reasonChipClasses(visit.reason))}>
                  {reasonLabel(visit.reason)}
                </span>
                {severityLabel(visit.severity) && (
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", severityChipClasses(visit.severity))}>
                    {severityLabel(visit.severity)}
                  </span>
                )}
                {durationLabel(visit.duration) && (
                  <span className="text-xs text-muted-foreground">{durationLabel(visit.duration)}</span>
                )}
              </div>
              {visit.notes && (
                <p className="text-sm text-muted-foreground">&ldquo;{visit.notes}&rdquo;</p>
              )}
            </div>
            <Link href={newRxHref} className="shrink-0">
              <Button size="lg" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Write Prescription
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={FileText} tone="text-primary bg-primary/10" value={prescriptions.length} label="Total Visits" />
        <StatTile
          icon={CalendarClock}
          tone="text-chart-1 bg-chart-1/10"
          value={lastVisit ? format(new Date(lastVisit.createdAt), "d MMM yyyy") : "—"}
          label="Last Visit"
        />
        <StatTile
          icon={CalendarCheck}
          tone="text-chart-2 bg-chart-2/10"
          value={nextFollowUp}
          label="Next Follow-up"
        />
      </div>

      {/* Info + history */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <IconRow icon={Phone} label="Phone" value={patient.phone} />
            <IconRow icon={User} label="Age / Gender" value={`${patient.age}y · ${patient.gender}`} />
            <IconRow icon={Weight} label="Weight" value={patient.weight} />
            <IconRow icon={HeartPulse} label="Blood Pressure" value={patient.bp} />
            <IconRow icon={CalendarDays} label="Registered" value={format(new Date(patient.createdAt), "d MMM yyyy")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4 text-destructive" />
              Medical History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HistoryItem icon={Activity} tone="text-chart-3 bg-chart-3/10" label="Conditions" value={conditions} />
            <HistoryItem icon={TriangleAlert} tone="text-chart-5 bg-chart-5/10" label="Allergies" value={patient.allergies} />
            <HistoryItem icon={Droplet} tone="text-chart-1 bg-chart-1/10" label="Diabetes" value={patient.diabetesStatus} />
          </CardContent>
        </Card>
      </div>

      {labReports.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Lab Reports
              <span className="text-sm font-normal text-muted-foreground">
                {labReports.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {labReports.map((report) => (
                <a
                  key={report.id}
                  href={report.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-lg border p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {report.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {formatFileSize(report.fileSize)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {format(new Date(report.createdAt), "d MMM yyyy, h:mm a")}
                      </p>
                      {report.notes && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {report.notes}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visit history (consolidated + scrollable + sortable) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">
            Visit History
            {prescriptions.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {prescriptions.length}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {prescriptions.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
                      <span className="sm:hidden">Sort</span>
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sort}
                      onValueChange={(v) => setSort(v as SortKey)}
                    >
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                        <DropdownMenuRadioItem key={k} value={k}>
                          {SORT_LABELS[k]}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!visit && (
              <Link href={newRxHref}>
                <Button size="sm" className="gap-1.5">
                  <PlusCircle className="h-4 w-4" />
                  New Prescription
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">First-time patient</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No previous visits. Write the first prescription to get started.
              </p>
            </div>
          ) : (
            <div className="max-h-[440px] space-y-2.5 overflow-y-auto pr-0.5">
              {sorted.map((rx) => {
                const isLatest = rx.id === latestId;
                return (
                  <Link
                    key={rx.id}
                    href={`/prescriptions/${rx.id}`}
                    className={cn(
                      "block rounded-lg border p-3.5 transition-colors hover:bg-accent/50",
                      isLatest && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {format(new Date(rx.createdAt), "d MMM yyyy, h:mm a")}
                          </span>
                          {isLatest && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                              Latest
                            </Badge>
                          )}
                        </div>
                        {rx.diagnosis && (
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                            {rx.diagnosis}
                          </p>
                        )}
                        {isLatest && rx.advice && (
                          <p className="text-xs text-muted-foreground">{rx.advice}</p>
                        )}
                        {rx.medicines.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <Pill className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {rx.medicines.slice(0, 3).map((m, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {m.name}
                              </Badge>
                            ))}
                            {rx.medicines.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{rx.medicines.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {fromQueue && queueEntryId && (
        <div className="flex justify-end border-t pt-6">
          <ConsultationDoneButton queueEntryId={queueEntryId} />
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  value: string | number;
  label: string;
}) {
  const [fg, bg] = tone.split(" ");
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className={cn("rounded-xl p-2.5", bg)}>
          <Icon className={cn("h-5 w-5", fg)} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IconRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-medium">{value}</span>
    </div>
  );
}

function HistoryItem({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string | null | undefined;
}) {
  const [fg, bg] = tone.split(" ");
  return (
    <div className="flex items-start gap-3">
      <div className={cn("mt-0.5 shrink-0 rounded-lg p-1.5", value ? bg : "bg-muted")}>
        <Icon className={cn("h-4 w-4", value ? fg : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm", value ? "font-medium" : "text-muted-foreground")}>
          {value || "None recorded"}
        </p>
      </div>
    </div>
  );
}
