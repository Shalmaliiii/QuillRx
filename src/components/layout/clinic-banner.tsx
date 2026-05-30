"use client";

import { useAuth } from "@/contexts/auth-context";

export function ClinicBanner() {
  const { doctor } = useAuth();

  if (!doctor?.clinicName) return null;

  return (
    <div className="flex items-center gap-4">
      {doctor.logoUrl ? (
        <div className="size-14 shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={doctor.logoUrl}
            alt={doctor.clinicName}
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary shadow-sm ring-1 ring-primary/10">
          {doctor.clinicName.charAt(0).toUpperCase()}
        </div>
      )}
      <h2 className="truncate text-xl font-semibold leading-tight">
        {doctor.clinicName}
      </h2>
    </div>
  );
}
