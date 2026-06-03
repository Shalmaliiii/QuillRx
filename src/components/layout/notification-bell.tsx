"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, X, ListChecks } from "lucide-react";
import {
  useQueueNotifications,
  formatNotificationTime,
} from "@/contexts/queue-notifications-context";
import { cn } from "@/lib/utils";

export function NotificationBell({
  panelClassName,
}: {
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { counts, notifications, markAllRead, loading } = useQueueNotifications();

  const hasQueue = counts.waiting > 0 || counts.inProgress > 0;
  const badgeCount = counts.waiting;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
      markAllRead();
    }
  }, [open, markAllRead]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Bell className="h-5 w-5" />
        {badgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60]">
            <div
              className="absolute inset-0 bg-foreground/10 backdrop-blur-[1.5px] animate-in fade-in-0 duration-150"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-label="Notifications"
              className={cn(
                "absolute right-3 top-[84px] w-[min(20rem,calc(100vw-1.5rem))] origin-top-right rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150 md:right-6",
                panelClassName
              )}
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Notifications</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {hasQueue && (
                <Link
                  href="/queue"
                  onClick={() => setOpen(false)}
                  className="block border-b px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Patient queue</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {counts.waiting > 0
                          ? `${counts.waiting} waiting`
                          : "No one waiting"}
                        {counts.inProgress > 0 &&
                          ` · ${counts.inProgress} in consultation`}
                      </p>
                    </div>
                  </div>
                </Link>
              )}

              <div className="max-h-72 overflow-y-auto">
                {loading ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Loading…
                  </p>
                ) : notifications.length > 0 ? (
                  <ul className="divide-y">
                    {notifications.map((n) => (
                      <li key={n.id} className="px-4 py-3">
                        <p className="text-sm leading-snug">{n.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatNotificationTime(n.at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : !hasQueue ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium">You&apos;re all caught up</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Queue updates will appear here
                    </p>
                  </div>
                ) : (
                  <p className="px-4 py-4 text-center text-xs text-muted-foreground">
                    New check-ins will show here
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
