"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PillLogo } from "@/components/layout/pill-logo";
import { cn } from "@/lib/utils";
import {
  QUEUE_REASONS,
  QUEUE_DURATIONS,
  QUEUE_SEVERITIES,
} from "@/lib/queue-options";

interface ClinicInfo {
  id: string;
  fullName: string;
  qualification: string;
  specialization: string;
  clinicName: string | null;
  logoUrl: string | null;
}

const GENDERS = ["Male", "Female", "Other"] as const;

export default function QueueIntakePage() {
  const params = useParams<{ doctorId: string }>();
  const doctorId = params.doctorId;
  const router = useRouter();

  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/public/clinic/${doctorId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(setClinic)
      .catch(() => setNotFound(true))
      .finally(() => setLoadingClinic(false));
  }, [doctorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !age || !gender || !phone.trim() || !reason) {
      toast.error("Please fill name, age, gender, phone and reason");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          name: name.trim(),
          age: Number(age),
          gender,
          phone: phone.trim(),
          reason,
          duration: duration || undefined,
          severity: severity || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not join the queue");
        return;
      }

      router.push(`/q/${doctorId}/status/${data.id}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingClinic) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !clinic) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <PillLogo className="h-10 w-10" />
        <h1 className="text-xl font-bold">Clinic not found</h1>
        <p className="text-sm text-muted-foreground">
          This queue link looks invalid. Please scan the QR code again or ask the
          clinic for help.
        </p>
      </div>
    );
  }

  const displayName = clinic.fullName.startsWith("Dr.")
    ? clinic.fullName
    : `Dr. ${clinic.fullName}`;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Clinic header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-8 text-primary-foreground">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {clinic.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinic.logoUrl}
              alt="Clinic logo"
              className="size-12 shrink-0 rounded-xl border border-white/30 object-cover"
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl font-bold">
              {(clinic.clinicName || clinic.fullName).charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold leading-tight">
              {clinic.clinicName || displayName}
            </h1>
            <p className="truncate text-sm text-primary-foreground/80">
              {displayName} · {clinic.specialization}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-lg space-y-6 px-5 py-6"
      >
        <div>
          <h2 className="text-lg font-semibold">Join the queue</h2>
          <p className="text-sm text-muted-foreground">
            Fill this quick form to check in. You&apos;ll get a token number and
            your live position.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                min={0}
                max={150}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <ChoiceButton
                    key={g}
                    active={gender === g}
                    onClick={() => setGender(g)}
                    className="flex-1"
                  >
                    {g}
                  </ChoiceButton>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              required
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
          <Label>What brings you in?</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {QUEUE_REASONS.map((r) => (
              <ChoiceButton
                key={r.value}
                active={reason === r.value}
                onClick={() => setReason(r.value)}
              >
                {r.label}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <Label>Since when? (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {QUEUE_DURATIONS.map((d) => (
                <ChoiceButton
                  key={d.value}
                  active={duration === d.value}
                  onClick={() => setDuration(duration === d.value ? "" : d.value)}
                >
                  {d.label}
                </ChoiceButton>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>How severe? (optional)</Label>
            <div className="flex gap-2">
              {QUEUE_SEVERITIES.map((s) => (
                <ChoiceButton
                  key={s.value}
                  active={severity === s.value}
                  onClick={() => setSeverity(severity === s.value ? "" : s.value)}
                  className="flex-1"
                >
                  {s.label}
                </ChoiceButton>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anything else? (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Briefly describe your problem"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Have lab reports? You can upload them on the token page after
            joining the queue.
          </p>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining queue...
            </>
          ) : (
            "Join the queue"
          )}
        </Button>
      </form>
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:bg-accent",
        className
      )}
    >
      {children}
    </button>
  );
}
