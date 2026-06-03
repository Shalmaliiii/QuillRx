"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function AccountMenu({
  avatarSize = "lg",
  className,
}: {
  avatarSize?: "default" | "sm" | "lg";
  className?: string;
}) {
  const { doctor, logout } = useAuth();

  const displayName = doctor?.fullName?.startsWith("Dr.")
    ? doctor.fullName
    : `Dr. ${doctor?.fullName ?? ""}`.trim();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          "rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      >
        <Avatar size={avatarSize}>
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
          onClick={() => void logout()}
          className="py-2"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
