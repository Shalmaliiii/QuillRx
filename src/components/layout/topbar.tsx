"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, X, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { PageHeading } from "@/contexts/page-header-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

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
        <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50">
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
              className="absolute right-6 top-[84px] w-80 origin-top-right rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
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
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">You&apos;re all caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  New notifications will appear here
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function TopBar() {
  const { doctor, logout } = useAuth();

  const displayName = doctor?.fullName?.startsWith("Dr.")
    ? doctor.fullName
    : `Dr. ${doctor?.fullName ?? ""}`.trim();

  return (
    <header className="hidden md:flex h-20 items-center gap-4 border-b bg-background/95 px-8 sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <PageHeading className="flex-1" />

      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar size="lg">
              <AvatarFallback className="bg-primary/10 font-medium text-primary">
                {doctor?.fullName?.charAt(0) || "D"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{displayName || "Doctor"}</p>
              {doctor?.email && (
                <p className="truncate text-xs text-muted-foreground">{doctor.email}</p>
              )}
            </div>
            <DropdownMenuSeparator className="mx-2" />
            <DropdownMenuItem render={<Link href="/profile" />} className="py-2">
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="mx-2" />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => logout()}
              className="py-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
