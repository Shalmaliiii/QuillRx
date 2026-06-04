"use client";

import { PageHeading } from "@/contexts/page-header-context";
import { NotificationBell } from "@/components/layout/notification-bell";
import { AccountMenu } from "@/components/layout/account-menu";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 hidden h-20 items-center gap-4 border-b bg-background/95 px-8 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:flex">
      <PageHeading className="flex-1" />

      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell />
        <AccountMenu avatarSize="lg" />
      </div>
    </header>
  );
}
