"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Stethoscope, Clock, XCircle } from "lucide-react";
import { PillLogo } from "@/components/layout/pill-logo";
import { reasonLabel, formatWaitMinutes } from "@/lib/queue-options";
import type { QueueStatus } from "@/types";

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
  const [loading, setLoading] = useState(true);
  const [gone, setGone] = useState(false);

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

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

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
