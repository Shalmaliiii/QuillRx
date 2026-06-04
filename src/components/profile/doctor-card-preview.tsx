import { Phone, Mail, MapPin, Clock } from "lucide-react";
import type { DoctorProfile } from "@/types";
import { cn } from "@/lib/utils";

type DoctorCardPreviewProps = {
  doctor: DoctorProfile | null;
  displayName: string;
  className?: string;
};

export function DoctorCardPreview({
  doctor,
  displayName,
  className,
}: DoctorCardPreviewProps) {
  const contacts = [
    {
      icon: Phone,
      value: doctor?.clinicPhone || doctor?.mobileNumber,
    },
    { icon: Mail, value: doctor?.email },
    { icon: Clock, value: doctor?.consultationTimings },
    { icon: MapPin, value: doctor?.clinicAddress },
  ].filter((c) => c.value);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg shadow-black/5",
        className
      )}
    >
      <div className="grid min-h-[220px] grid-cols-[minmax(9.5rem,38%)_1fr] sm:min-h-[240px]">
        {/* Left panel */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0f5568] via-[#14697f] to-[#0a3d4d] p-5 text-white">
          <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute bottom-8 -left-4 size-14 rounded-full bg-white/5" />

          <div className="relative z-10 flex h-full flex-col">
            {doctor?.logoUrl ? (
              <div className="mb-4 size-12 overflow-hidden rounded-xl bg-white p-0.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doctor.logoUrl}
                  alt="Clinic logo"
                  className="size-full rounded-[10px] object-cover"
                />
              </div>
            ) : (
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-white/15 text-lg font-bold backdrop-blur-sm">
                {doctor?.fullName?.charAt(0) || "D"}
              </div>
            )}

            <div className="mt-auto space-y-1.5">
              <p className="text-lg font-bold leading-tight tracking-tight">
                {displayName || "Doctor"}
              </p>
              <p className="text-xs leading-snug text-sky-100/90">
                {[doctor?.qualification, doctor?.specialization]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {doctor?.registrationNumber && (
                <span className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium tracking-wide">
                  Reg. {doctor.registrationNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col justify-between bg-gradient-to-br from-slate-50/80 to-white p-5 dark:from-muted/20 dark:to-card">
          <div>
            {doctor?.clinicName && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Clinic
                </p>
                <p className="mt-0.5 text-base font-bold tracking-tight text-foreground">
                  {doctor.clinicName}
                </p>
              </div>
            )}

            <ul className="space-y-2.5">
              {contacts.map(({ icon: Icon, value }) => (
                <li key={value} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 break-words leading-snug text-foreground/90">
                    {value}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            QuillRx
          </p>
        </div>
      </div>
    </div>
  );
}
