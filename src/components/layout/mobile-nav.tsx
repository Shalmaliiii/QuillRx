"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  PlusCircle,
  LogOut,
  Menu,
  ListChecks,
  User,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PillLogo } from "@/components/layout/pill-logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import { AccountMenu } from "@/components/layout/account-menu";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/queue", label: "Queue", icon: ListChecks },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/templates", label: "Templates", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isNavActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (pathname.startsWith(`${href}/`) &&
      !navItems.some(
        (other) =>
          other.href !== href &&
          other.href.startsWith(`${href}/`) &&
          (pathname === other.href || pathname.startsWith(`${other.href}/`))
      ))
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { doctor, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    close();
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-14 items-center gap-2 px-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="shrink-0" aria-label="Open menu" />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="flex h-full w-72 flex-col gap-0 p-0">
            <div className="border-b p-6">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={close}>
                <PillLogo className="h-6 w-6" />
                <span className="text-lg font-bold">QuillRx</span>
              </Link>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {navItems.map((item) => {
                const isActive = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <SheetFooter className="mt-auto gap-2 border-t p-4">
              <Link
                href="/profile"
                onClick={close}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {doctor?.fullName?.charAt(0) || "D"}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{doctor?.fullName}</p>
                  <p className="text-xs text-muted-foreground">View profile</p>
                </div>
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <PillLogo className="h-5 w-5 shrink-0" />
          <span className="truncate font-bold">QuillRx</span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <NotificationBell panelClassName="!top-[3.75rem]" />
          <AccountMenu avatarSize="default" />
          <Link href="/prescriptions/new">
            <Button size="icon" variant="ghost" className="shrink-0" aria-label="New prescription">
              <PlusCircle className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
