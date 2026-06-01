// Shared options for the patient queue intake form and doctor-side display.

export const QUEUE_REASONS = [
  { value: "fever", label: "Fever / Cold / Flu" },
  { value: "respiratory", label: "Cough / Breathing" },
  { value: "stomach", label: "Stomach / Digestion" },
  { value: "injury", label: "Injury / Body Pain" },
  { value: "checkup", label: "BP / Diabetes Check" },
  { value: "skin", label: "Skin Problem" },
  { value: "pediatric", label: "Child / Pediatric" },
  { value: "followup", label: "Follow-up Visit" },
  { value: "other", label: "Other" },
] as const;

export const QUEUE_DURATIONS = [
  { value: "today", label: "Since today" },
  { value: "few_days", label: "A few days" },
  { value: "week_plus", label: "A week or more" },
  { value: "chronic", label: "Long-standing" },
] as const;

export const QUEUE_SEVERITIES = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
] as const;

const REASON_MAP = Object.fromEntries(QUEUE_REASONS.map((r) => [r.value, r.label]));
const DURATION_MAP = Object.fromEntries(QUEUE_DURATIONS.map((d) => [d.value, d.label]));
const SEVERITY_MAP = Object.fromEntries(QUEUE_SEVERITIES.map((s) => [s.value, s.label]));

export const reasonLabel = (value?: string | null) =>
  (value && REASON_MAP[value]) || value || "General";

export const durationLabel = (value?: string | null) =>
  (value && DURATION_MAP[value]) || null;

export const severityLabel = (value?: string | null) =>
  (value && SEVERITY_MAP[value]) || null;

// Tailwind classes for the reason chip on the doctor's queue.
export function reasonChipClasses(value?: string | null): string {
  switch (value) {
    case "fever":
    case "respiratory":
      return "bg-chart-5/10 text-chart-5";
    case "stomach":
      return "bg-chart-4/10 text-chart-4";
    case "injury":
      return "bg-destructive/10 text-destructive";
    case "checkup":
    case "followup":
      return "bg-chart-1/10 text-chart-1";
    case "skin":
      return "bg-chart-3/10 text-chart-3";
    case "pediatric":
      return "bg-chart-2/10 text-chart-2";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// Builds a symptoms summary string to prefill a prescription from a queue entry.
export function buildVisitSymptoms(entry: {
  reason: string;
  duration?: string | null;
  severity?: string | null;
  notes?: string | null;
}): string {
  const qualifiers = [durationLabel(entry.duration), severityLabel(entry.severity)]
    .filter(Boolean)
    .join(", ");
  let s = reasonLabel(entry.reason);
  if (qualifiers) s += ` (${qualifiers})`;
  if (entry.notes) s += `. ${entry.notes}`;
  return s;
}

export function severityChipClasses(value?: string | null): string {
  switch (value) {
    case "severe":
      return "bg-destructive/10 text-destructive";
    case "moderate":
      return "bg-chart-5/10 text-chart-5";
    case "mild":
      return "bg-chart-2/10 text-chart-2";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function formatWaitMinutes(minutes: number): string {
  if (minutes <= 0) return "Any moment now";
  if (minutes === 1) return "~1 min";
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `~${hours} hr`;
  return `~${hours} hr ${mins} min`;
}
