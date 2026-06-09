"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, Loader2, UserX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reasonLabel, reasonChipClasses } from "@/lib/queue-options";
import type { QueueEntryData } from "@/types";

function WaitingPatientCard({
  entry,
  isNext,
  busy,
  onNoShow,
}: {
  entry: QueueEntryData;
  isNext?: boolean;
  busy?: boolean;
  onNoShow?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm transition-colors",
        isNext
          ? "border-primary ring-2 ring-primary/40 shadow-md shadow-primary/10"
          : "border-border/80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-bold tabular-nums",
                isNext ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
              )}
            >
              #{entry.tokenNumber}
            </span>
            <p className="truncate font-semibold text-foreground">{entry.name}</p>
            {isNext && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Next up
              </span>
            )}
          </div>
          <span
            className={cn(
              "mt-2 inline-block max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium",
              reasonChipClasses(entry.reason)
            )}
          >
            {reasonLabel(entry.reason)}
          </span>
          {isNext && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Joined {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            </p>
          )}
          {(entry.labReports?.length ?? 0) > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <FileText className="h-3.5 w-3.5" />
              {entry.labReports?.length} lab report
              {entry.labReports?.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {isNext && onNoShow && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onNoShow}
            disabled={busy}
            className="shrink-0 gap-1.5 text-muted-foreground"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
            No-show
          </Button>
        )}
      </div>
    </div>
  );
}

/** All waiting patients in one list — first entry highlighted as next up. */
export function QueueFolder({
  entries,
  className,
  onNoShow,
  busyId,
}: {
  entries: QueueEntryData[];
  className?: string;
  onNoShow?: (entry: QueueEntryData) => void;
  busyId?: string | null;
}) {
  if (entries.length === 0) return null;

  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-xl border border-border/80 bg-muted/30 p-4 dark:bg-muted/20",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Waiting list</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {entries.length} patient{entries.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex max-h-[480px] flex-col gap-2 overflow-y-auto pr-1">
        {entries.map((entry, index) => (
          <WaitingPatientCard
            key={entry.id}
            entry={entry}
            isNext={index === 0}
            busy={busyId === entry.id}
            onNoShow={index === 0 && onNoShow ? () => onNoShow(entry) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
