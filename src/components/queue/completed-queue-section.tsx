"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reasonLabel, reasonChipClasses } from "@/lib/queue-options";
import type { QueueEntryData } from "@/types";

const PAGE_SIZE = 5;

export function CompletedQueueSection({ entries }: { entries: QueueEntryData[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1));
  }, [entries.length, totalPages]);

  if (entries.length === 0) return null;

  const start = page * PAGE_SIZE;
  const visible = entries.slice(start, start + PAGE_SIZE);
  const rangeStart = start + 1;
  const rangeEnd = start + visible.length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Completed
        </h2>
        <span className="text-xs text-muted-foreground">
          {entries.length} patient{entries.length === 1 ? "" : "s"}
        </span>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {visible.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 text-sm font-semibold text-muted-foreground">
                  #{entry.tokenNumber}
                </span>
                <span className="truncate text-sm font-medium">{entry.name}</span>
                <span
                  className={cn(
                    "shrink-0 truncate rounded-full px-2 py-0.5 text-xs max-w-[8rem] sm:max-w-none",
                    reasonChipClasses(entry.reason)
                  )}
                >
                  {reasonLabel(entry.reason)}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {entry.status === "DONE" ? "Seen" : "No-show"}
              </span>
            </div>
          ))}
        </CardContent>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {entries.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[4.5rem] text-center text-xs font-medium tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
