"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Loader2,
  Stethoscope,
  CheckCircle2,
  Clock,
  Check,
  UserX,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePageHeader } from "@/contexts/page-header-context";
import { QueueStage } from "@/components/queue/queue-stage";
import { QueueFolder } from "@/components/queue/queue-folder";
import {
  reasonLabel,
  durationLabel,
  severityLabel,
  reasonChipClasses,
  severityChipClasses,
} from "@/lib/queue-options";
import type { QueueEntryData, QueueStatus } from "@/types";

interface QueueResponse {
  entries: QueueEntryData[];
  counts: { waiting: number; inProgress: number; done: number; total: number };
}

export default function QueuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeId = searchParams.get("complete");
  const autoDoneRef = useRef<string | null>(null);
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pollPaused, setPollPaused] = useState(false);
  const [exiting, setExiting] = useState<QueueEntryData | null>(null);

  usePageHeader({
    title: "Patient Queue",
    description: "Live check-ins from your clinic QR",
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // ignore transient errors during polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (pollPaused) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load, pollPaused]);

  const updateStatus = async (id: string, status: QueueStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      toast.error("Could not update the queue");
    } finally {
      setBusyId(null);
    }
  };

  const handleDone = (entry: QueueEntryData) => {
    setPollPaused(true);
    setExiting(entry);
  };

  const finishExit = useCallback(async (entry: QueueEntryData) => {
    setBusyId(entry.id);
    try {
      const res = await fetch(`/api/queue/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" }),
      });
      if (!res.ok) throw new Error();
      await load();
      toast.success(`${entry.name} marked as seen`);
    } catch {
      toast.error("Could not update the queue");
    } finally {
      setBusyId(null);
      setExiting(null);
      setPollPaused(false);
    }
  }, [load]);

  const callNext = async (entry: QueueEntryData) => {
    setPollPaused(true);
    setBusyId(entry.id);
    try {
      const res = await fetch(`/api/queue/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      if (!res.ok) throw new Error();
      await load();
      toast.success(`${entry.name} entered the consultation room`);
    } catch {
      toast.error("Could not call the next patient");
    } finally {
      setBusyId(null);
      setTimeout(() => setPollPaused(false), 1500);
    }
  };

  const startConsultation = async (entry: QueueEntryData) => {
    setBusyId(entry.id);
    try {
      const res = await fetch(`/api/queue/${entry.id}/start`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/patients/${json.patientId}?queueEntryId=${entry.id}`);
    } catch {
      toast.error("Could not start the consultation");
      setBusyId(null);
    }
  };

  const entries = data?.entries ?? [];
  const inProgress = entries.filter((e) => e.status === "IN_PROGRESS");
  const waiting = entries.filter((e) => e.status === "WAITING");
  const nextInQueue = waiting[0] ?? null;
  const folderPatients = waiting.slice(1);
  const finished = entries.filter(
    (e) => e.status === "DONE" || e.status === "NO_SHOW" || e.status === "CANCELLED"
  );

  useEffect(() => {
    if (!completeId || loading || exiting || autoDoneRef.current === completeId) return;

    let cancelled = false;

    (async () => {
      let entry =
        inProgress.find((e) => e.id === completeId) ??
        entries.find((e) => e.id === completeId && e.status === "IN_PROGRESS");

      if (!entry) {
        const res = await fetch(`/api/queue/${completeId}`);
        if (res.ok) {
          const fetched = await res.json();
          if (fetched.status === "IN_PROGRESS") entry = fetched;
        }
      }

      if (!entry || cancelled) return;

      autoDoneRef.current = completeId;
      router.replace("/queue");
      handleDone(entry);
    })();

    return () => {
      cancelled = true;
    };
  }, [completeId, loading, exiting, inProgress, entries, router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Clock} tone="text-primary bg-primary/10" label="Waiting" value={data?.counts.waiting ?? 0} />
        <StatCard icon={Stethoscope} tone="text-chart-1 bg-chart-1/10" label="In Progress" value={data?.counts.inProgress ?? 0} />
        <StatCard icon={CheckCircle2} tone="text-chart-2 bg-chart-2/10" label="Seen Today" value={data?.counts.done ?? 0} />
      </div>

      <QueueStage
        waiting={waiting}
        inProgress={inProgress}
        busy={!!busyId}
        exiting={exiting}
        onCallNext={callNext}
        onExitFinished={finishExit}
      />

      {inProgress.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Active consultation
          </h2>
          {inProgress.map((entry) => (
            <QueueCard
              key={entry.id}
              entry={entry}
              highlight
              busy={busyId === entry.id}
              onStart={() => startConsultation(entry)}
              onDone={() => handleDone(entry)}
              onNoShow={() => updateStatus(entry.id, "NO_SHOW")}
            />
          ))}
        </section>
      )}

      {nextInQueue && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Queue details
          </h2>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Next in queue</p>
              <QueueCard
                entry={nextInQueue}
                compact
                busy={busyId === nextInQueue.id}
                onNoShow={() => updateStatus(nextInQueue.id, "NO_SHOW")}
              />
            </div>

            {folderPatients.length > 0 ? (
              <QueueFolder entries={folderPatients} className="h-full" />
            ) : (
              <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                No other patients waiting behind them
              </div>
            )}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Completed
          </h2>
          <Card>
            <CardContent className="divide-y p-0">
              {finished.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-sm font-semibold text-muted-foreground">
                      #{entry.tokenNumber}
                    </span>
                    <span className="truncate text-sm font-medium">{entry.name}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs", reasonChipClasses(entry.reason))}>
                      {reasonLabel(entry.reason)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {entry.status === "DONE" ? "Seen" : "No-show"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
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
  value: number;
}) {
  const [fg, bg] = tone.split(" ");
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className={`rounded-xl p-2.5 ${bg}`}>
          <Icon className={`h-5 w-5 ${fg}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueCard({
  entry,
  highlight,
  compact,
  busy,
  onStart,
  onDone,
  onNoShow,
}: {
  entry: QueueEntryData;
  highlight?: boolean;
  compact?: boolean;
  busy?: boolean;
  onStart?: () => void;
  onCall?: () => void;
  onDone?: () => void;
  onNoShow?: () => void;
}) {
  const hasActions = onStart || onDone || onNoShow;

  return (
    <Card className={cn(highlight && "border-primary ring-1 ring-primary/30")}>
      <CardContent className={cn("flex flex-col gap-4 pt-6", compact ? "sm:flex-row sm:items-center sm:justify-between" : "sm:flex-row sm:items-start sm:justify-between")}>
        <div className="flex min-w-0 gap-3">
          <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-[9px] font-medium leading-none">TOKEN</span>
            <span className="text-base font-bold leading-tight">#{entry.tokenNumber}</span>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">{entry.name}</p>
            {!compact && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", reasonChipClasses(entry.reason))}>
                    {reasonLabel(entry.reason)}
                  </span>
                  {severityLabel(entry.severity) && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", severityChipClasses(entry.severity))}>
                      {severityLabel(entry.severity)}
                    </span>
                  )}
                  {durationLabel(entry.duration) && (
                    <span className="text-xs text-muted-foreground">{durationLabel(entry.duration)}</span>
                  )}
                </div>
                {entry.notes && <p className="text-sm text-muted-foreground">{entry.notes}</p>}
              </>
            )}
            {compact && (
              <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs", reasonChipClasses(entry.reason))}>
                {reasonLabel(entry.reason)}
              </span>
            )}
            <p className="text-xs text-muted-foreground">
              Joined {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {hasActions && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {onStart && (
              <Button size="sm" onClick={onStart} disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Start consultation
              </Button>
            )}
            {onDone && (
              <Button size="sm" variant="outline" onClick={onDone} disabled={busy} className="gap-1.5">
                <Check className="h-4 w-4" />
                Done
              </Button>
            )}
            {onNoShow && (
              <Button size="sm" variant="ghost" onClick={onNoShow} disabled={busy} className="gap-1.5 text-muted-foreground">
                <UserX className="h-4 w-4" />
                No-show
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
