"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { reasonLabel, reasonChipClasses } from "@/lib/queue-options";
import type { QueueEntryData } from "@/types";

const CARD_H = 132;

function FolderPatientCard({
  entry,
  isFront,
}: {
  entry: QueueEntryData;
  isFront?: boolean;
}) {
  return (
    <div
      className={cn(
        "h-full w-full overflow-hidden rounded-xl border-2 bg-card shadow-md",
        isFront ? "border-primary/45" : "border-border/70"
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
          #{entry.tokenNumber}
        </span>
        {isFront && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
            Up next
          </span>
        )}
      </div>
      <div className="px-3 py-3">
        <p className="truncate font-semibold text-foreground">{entry.name}</p>
        <span
          className={cn(
            "mt-1.5 inline-block max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium",
            reasonChipClasses(entry.reason)
          )}
        >
          {reasonLabel(entry.reason)}
        </span>
      </div>
    </div>
  );
}

/** Waiting patients stacked in a folder — hover slides the top card aside. */
export function QueueFolder({
  entries,
  frontEntryId,
  className,
}: {
  entries: QueueEntryData[];
  frontEntryId?: string;
  promoting?: boolean;
  popEntryId?: string | null;
  className?: string;
}) {
  const [hovering, setHovering] = useState(false);
  const visible = entries.slice(0, 5);
  const overflow = entries.length - visible.length;
  const count = visible.length;
  const stackHeight = CARD_H + Math.max(0, count - 1) * 14;

  if (entries.length === 0) return null;

  return (
    <div
      className={cn(
        "relative flex w-full flex-col rounded-xl border border-border/80 bg-muted/30 p-4 dark:bg-muted/20",
        className
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Waiting folder</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {entries.length} patient{entries.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl rounded-tl-md border border-border/60 bg-gradient-to-b from-muted/80 to-muted/30 p-4 pb-5 dark:from-muted/50 dark:to-muted/20">
        {/* Folder tab */}
        <div className="absolute -top-px left-3 h-4 w-16 rounded-t-md border border-b-0 border-border/60 bg-muted/90 dark:bg-muted/70" />

        {/* Card stack — clipped so nothing escapes */}
        <div
          className="relative mx-auto w-full max-w-md"
          style={{ height: stackHeight + (hovering && count > 1 ? 8 : 0) }}
        >
          {visible.map((entry, i) => {
            const isTop = i === 0;
            const isFront = entry.id === frontEntryId;
            const layer = i;
            const peek = layer * 14;

            return (
              <div
                key={entry.id}
                className={cn(
                  "absolute left-0 right-0 transition-all duration-300 ease-out",
                  isTop && hovering && count > 1 && "translate-x-[28%] scale-[0.88] opacity-95",
                  !isTop && hovering && "translate-y-[-2px]"
                )}
                style={{
                  height: CARD_H,
                  bottom: peek,
                  zIndex: count - i,
                  transitionDelay: isTop && hovering ? "0ms" : `${layer * 40}ms`,
                }}
              >
                <FolderPatientCard entry={entry} isFront={isFront} />
              </div>
            );
          })}
        </div>

        {overflow > 0 && (
          <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
            +{overflow} more not shown
          </p>
        )}

        {count > 1 && !hovering && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Hover to peek at patients behind
          </p>
        )}
        {count > 1 && hovering && (
          <p className="mt-3 text-center text-[11px] font-medium text-primary">
            {count} patients in folder
          </p>
        )}
      </div>
    </div>
  );
}
