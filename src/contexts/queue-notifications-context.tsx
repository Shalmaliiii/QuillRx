"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { QueueEntryData } from "@/types";

export interface QueueNotificationItem {
  id: string;
  message: string;
  at: string;
  unread: boolean;
}

interface QueueCounts {
  waiting: number;
  inProgress: number;
  done: number;
  total: number;
}

interface QueueNotificationsContextValue {
  counts: QueueCounts;
  notifications: QueueNotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  loading: boolean;
}

const defaultCounts: QueueCounts = {
  waiting: 0,
  inProgress: 0,
  done: 0,
  total: 0,
};

const QueueNotificationsContext =
  createContext<QueueNotificationsContextValue | null>(null);

const POLL_MS = 10_000;

export function QueueNotificationsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<QueueCounts>(defaultCounts);
  const [notifications, setNotifications] = useState<QueueNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const prevWaitingRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  const pushNotification = useCallback((message: string, opts?: { toast?: boolean }) => {
    const item: QueueNotificationItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      at: new Date().toISOString(),
      unread: true,
    };
    setNotifications((prev) => [item, ...prev].slice(0, 20));
    if (opts?.toast) toast.info(message);
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const entries = (data.entries ?? []) as QueueEntryData[];
      const nextCounts = data.counts ?? defaultCounts;
      setCounts(nextCounts);

      const waitingEntries = entries.filter((e) => e.status === "WAITING");
      const currentIds = new Set(entries.map((e) => e.id));

      if (knownIdsRef.current !== null) {
        const newWaiting = waitingEntries.filter((e) => !knownIdsRef.current!.has(e.id));
        if (newWaiting.length === 1) {
          const e = newWaiting[0];
          pushNotification(`${e.name} (#${e.tokenNumber}) joined the queue`, { toast: true });
        } else if (newWaiting.length > 1) {
          pushNotification(`${newWaiting.length} patients joined the queue`, { toast: true });
        } else if (
          prevWaitingRef.current !== null &&
          nextCounts.waiting !== prevWaitingRef.current &&
          nextCounts.waiting > 0
        ) {
          const n = nextCounts.waiting;
          pushNotification(
            `${n} patient${n === 1 ? "" : "s"} waiting in queue`
          );
        }
      }

      knownIdsRef.current = currentIds;
      prevWaitingRef.current = nextCounts.waiting;
    } catch {
      // ignore transient poll errors
    } finally {
      if (!mountedRef.current) {
        mountedRef.current = true;
        setLoading(false);
      }
    }
  }, [pushNotification]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const unreadCount =
    notifications.filter((n) => n.unread).length + (counts.waiting > 0 ? 1 : 0);

  return (
    <QueueNotificationsContext.Provider
      value={{ counts, notifications, unreadCount, markAllRead, loading }}
    >
      {children}
    </QueueNotificationsContext.Provider>
  );
}

export function useQueueNotifications() {
  const ctx = useContext(QueueNotificationsContext);
  if (!ctx) {
    throw new Error("useQueueNotifications must be used within QueueNotificationsProvider");
  }
  return ctx;
}

export function formatNotificationTime(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}
