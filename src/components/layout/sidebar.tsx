"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { PillLogo } from "@/components/layout/pill-logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/queue", label: "Queue", icon: ListChecks },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { doctor } = useAuth();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card h-screen sticky top-0">
      <div className="h-20 px-6 flex flex-col justify-center border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <PillLogo className="h-7 w-7" />
          <span className="text-xl font-bold tracking-tight">QuillRx</span>
        </Link>
        {doctor?.clinicName && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {doctor.clinicName}
          </p>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href + "/") && !navItems.some(other => other.href !== item.href && other.href.startsWith(item.href + "/") && (pathname === other.href || pathname.startsWith(other.href + "/"))));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <p className="px-2 text-xs text-muted-foreground">
          {doctor?.clinicName || "QuillRx"}
        </p>
      </div>
    </aside>
  );
}
