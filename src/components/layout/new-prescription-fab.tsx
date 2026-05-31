"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle } from "lucide-react";

export function NewPrescriptionFab() {
  const pathname = usePathname();

  if (pathname === "/prescriptions/new") return null;

  return (
    <Link
      href="/prescriptions/new"
      aria-label="New Prescription"
      className="fixed bottom-6 right-6 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-95"
    >
      <PlusCircle className="h-5 w-5" />
      <span className="hidden sm:inline">New Prescription</span>
    </Link>
  );
}
