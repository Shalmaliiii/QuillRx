"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  Stethoscope,
  Clock,
  XCircle,
  Upload,
  FileText,
  ExternalLink,
} from "lucide-react";
import { PillLogo } from "@/components/layout/pill-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LabReportFilePicker } from "@/components/queue/lab-report-file-picker";
import { reasonLabel, formatWaitMinutes } from "@/lib/queue-options";
import { toast } from "@/lib/toast";
import type { LabReportData, QueueStatus } from "@/types";

interface StatusData {
  id: string;
  tokenNumber: number;
  status: QueueStatus;
  peopleAhead: number;
  estimatedWaitMinutes: number | null;
  name: string;
  reason: string;
  clinicName: string | null;
  doctorName: string | null;
}

export default function QueueStatusPage() {
  const params = useParams<{ entryId: string }>();
  const entryId = params.entryId;

  const [data, setData] = useState<StatusData | null>(null);
  const [reports, setReports] = useState<LabReportData[]>([]);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [selectedReportFiles, setSelectedReportFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [gone, setGone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previousStatusRef = useRef<{
    status: QueueStatus;
    peopleAhead: number;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/queue/${entryId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setGone(true);
        return;
      }
      setData(await res.json());
    } catch {
      // keep last known data on transient errors
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/queue/${entryId}/lab-reports`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const payload = await res.json();
      setReports(payload.reports ?? []);
    } catch {
      // keep the last visible report list on transient errors
    }
  }, [entryId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void load();
      void loadReports();
    }, 0);
    const poll = window.setInterval(() => {
      void load();
    }, 5000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(poll);
    };
  }, [load, loadReports]);

  const submitLabReport = async (event: React.FormEvent) => {
    event.preventDefault();

    const file = selectedReportFiles[0] ?? null;
    if (!file) {
      toast.error("Please choose a lab report file");
      return;
    }

    setUploadingReport(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", reportTitle.trim());
      formData.append("notes", reportNotes.trim());

      const res = await fetch(`/api/public/queue/${entryId}/lab-reports`, {
        method: "POST",
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Could not upload lab report");
      }

      setReports((prev) => [payload.report, ...prev]);
      setReportTitle("");
      setReportNotes("");
      setSelectedReportFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Lab report submitted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload lab report"
      );
    } finally {
      setUploadingReport(false);
    }
  };

  useEffect(() => {
    if (!data) return;

    const previous = previousStatusRef.current;
    if (!previous) {
      previousStatusRef.current = {
        status: data.status,
        peopleAhead: data.peopleAhead,
      };
      return;
    }

    const becameNext =
      data.status === "WAITING" &&
      data.peopleAhead === 0 &&
      (previous.status !== "WAITING" || previous.peopleAhead > 0);
    const calledIn =
      data.status === "IN_PROGRESS" && previous.status !== "IN_PROGRESS";

    if (calledIn) {
      notifyPatient("turn");
    } else if (becameNext) {
      notifyPatient("next");
    }

    previousStatusRef.current = {
      status: data.status,
      peopleAhead: data.peopleAhead,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (gone || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <PillLogo className="h-10 w-10" />
        <h1 className="text-xl font-bold">Token not found</h1>
        <p className="text-sm text-muted-foreground">
          This token may have been cleared. Please check in again.
        </p>
      </div>
    );
  }

  const canSubmitReports =
    data.status === "WAITING" || data.status === "IN_PROGRESS";

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/30 px-5 py-10">
      <div className="mb-6 flex items-center gap-2">
        <PillLogo className="h-6 w-6" />
        <span className="font-semibold">
          {data.clinicName || data.doctorName || "Clinic"}
        </span>
      </div>

      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Your token number</p>
        <p className="my-1 text-6xl font-bold tracking-tight text-primary">
          #{data.tokenNumber}
        </p>
        <p className="text-sm font-medium">{data.name}</p>
        <span className="mt-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {reasonLabel(data.reason)}
        </span>

        <div className="my-6 h-px bg-border" />

        <StatusBlock
          status={data.status}
          peopleAhead={data.peopleAhead}
          estimatedWaitMinutes={data.estimatedWaitMinutes}
        />
      </div>

      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        Keep this page open — it updates automatically. Please stay nearby; you
        may be called shortly.
      </p>

      <div className="mt-6 w-full max-w-sm rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Lab reports</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload PDFs or images so the doctor can review them before your turn.
          </p>
        </div>

        {canSubmitReports ? (
          <form onSubmit={submitLabReport} className="space-y-3">
            <LabReportFilePicker
              inputRef={fileInputRef}
              id="report-file"
              disabled={uploadingReport}
              selectedFiles={selectedReportFiles}
              onFilesChange={setSelectedReportFiles}
            />
            <div className="space-y-1.5">
              <Label htmlFor="report-title">Name</Label>
              <Input
                id="report-title"
                value={reportTitle}
                onChange={(event) => setReportTitle(event.target.value)}
                placeholder="e.g. Blood test, X-ray"
                disabled={uploadingReport}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-notes">Notes (optional)</Label>
              <Textarea
                id="report-notes"
                value={reportNotes}
                onChange={(event) => setReportNotes(event.target.value)}
                placeholder="Anything the doctor should notice"
                rows={2}
                disabled={uploadingReport}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={uploadingReport}>
              {uploadingReport ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Submit report
            </Button>
          </form>
        ) : (
          <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
            This visit is closed, so new lab reports cannot be submitted here.
          </div>
        )}

        {reports.length > 0 && (
          <div className="mt-5 space-y-2 border-t pt-4">
            {reports.map((report) => (
              <a
                key={report.id}
                href={report.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {report.title}
                    </span>
                  </span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBlock({
  status,
  peopleAhead,
  estimatedWaitMinutes,
}: {
  status: QueueStatus;
  peopleAhead: number;
  estimatedWaitMinutes: number | null;
}) {
  if (status === "IN_PROGRESS") {
    return (
      <div className="flex flex-col items-center gap-2">
        <Stethoscope className="h-9 w-9 text-primary" />
        <p className="text-lg font-semibold text-primary">It&apos;s your turn</p>
        <p className="text-sm text-muted-foreground">
          Please proceed to the doctor&apos;s room.
        </p>
      </div>
    );
  }

  if (status === "DONE") {
    return (
      <div className="flex flex-col items-center gap-2">
        <CheckCircle2 className="h-9 w-9 text-chart-2" />
        <p className="text-lg font-semibold">Consultation complete</p>
        <p className="text-sm text-muted-foreground">Take care and get well soon.</p>
      </div>
    );
  }

  if (status === "NO_SHOW" || status === "CANCELLED") {
    return (
      <div className="flex flex-col items-center gap-2">
        <XCircle className="h-9 w-9 text-muted-foreground" />
        <p className="text-lg font-semibold">Removed from queue</p>
        <p className="text-sm text-muted-foreground">
          Please check in again at the front desk if needed.
        </p>
      </div>
    );
  }

  // WAITING
  const waitLabel =
    estimatedWaitMinutes != null
      ? formatWaitMinutes(estimatedWaitMinutes)
      : null;

  return (
    <div className="flex flex-col items-center gap-2">
      <Clock className="h-9 w-9 text-primary" />
      {peopleAhead === 0 ? (
        <p className="text-lg font-semibold text-primary">You&apos;re next</p>
      ) : (
        <>
          <p className="text-3xl font-bold">{peopleAhead}</p>
          <p className="text-sm text-muted-foreground">
            {peopleAhead === 1 ? "person" : "people"} ahead of you
          </p>
        </>
      )}
      {waitLabel && (
        <p className="mt-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          Approx. wait: {waitLabel}
        </p>
      )}
    </div>
  );
}

type QueueAlertKind = "next" | "turn";

type WindowWithLegacyAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function notifyPatient(kind: QueueAlertKind) {
  if (typeof window === "undefined") return;

  if ("vibrate" in navigator) {
    navigator.vibrate(kind === "turn" ? [180, 80, 180] : [120, 60, 120]);
  }

  void playQueueChime(kind);
}

async function playQueueChime(kind: QueueAlertKind) {
  try {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as WindowWithLegacyAudio).webkitAudioContext;

    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    const notes = kind === "turn" ? [784, 1046] : [660, 880];

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    gain.connect(audioContext.destination);

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const start = now + index * 0.13;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + 0.2);
    });

    window.setTimeout(() => {
      void audioContext.close();
    }, 700);
  } catch {
    // Mobile browsers may block sound until the page has user interaction.
  }
}
