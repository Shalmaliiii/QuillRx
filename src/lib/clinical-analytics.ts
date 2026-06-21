type PatientForAnalytics = {
  age: number;
  gender: string;
};

type MedicineForAnalytics = {
  name: string;
  strength?: string | null;
  morning?: boolean;
  afternoon?: boolean;
  night?: boolean;
  beforeFood?: boolean;
  duration?: string | null;
  specialInstructions?: string | null;
};

type PrescriptionForAnalytics = {
  patientId?: string | null;
  createdAt: Date | string;
  followUpDate?: Date | string | null;
  diagnosis?: string | null;
  symptoms?: string | null;
  medicines?: MedicineForAnalytics[] | null;
  totalAmount?: number | null;
  consultationFee?: number | null;
  patient?: PatientForAnalytics | null;
};

export type AnalyticsRangeKey = "today" | "week" | "month";

export type RankedMetric = {
  label: string;
  count: number;
  percentage: number;
};

export type ClinicalAnalyticsRange = {
  key: AnalyticsRangeKey;
  label: string;
  startsAt: string;
  endsAt: string;
  prescriptions: number;
  uniquePatients: number;
  revenue: number;
  followUps: number;
  diseases: RankedMetric[];
  symptoms: RankedMetric[];
  medicines: RankedMetric[];
  ageGroups: RankedMetric[];
  genderMix: RankedMetric[];
};

const RANGE_LABELS: Record<AnalyticsRangeKey, string> = {
  today: "Today",
  week: "Last 7 days",
  month: "Last 30 days",
};

const AGE_GROUPS = [
  { label: "0-12", min: 0, max: 12 },
  { label: "13-18", min: 13, max: 18 },
  { label: "19-35", min: 19, max: 35 },
  { label: "36-50", min: 36, max: 50 },
  { label: "51-65", min: 51, max: 65 },
  { label: "66+", min: 66, max: Infinity },
];

const COMMON_SYMPTOM_WORDS = new Set([
  "and",
  "with",
  "without",
  "the",
  "for",
  "since",
  "from",
  "patient",
  "complains",
  "complaint",
  "history",
  "having",
  "has",
  "of",
  "in",
  "on",
  "to",
  "a",
  "an",
]);

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function buildAnalyticsRanges(now = new Date()) {
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 29);

  return {
    today: { start: todayStart, end: tomorrow },
    week: { start: weekStart, end: tomorrow },
    month: { start: monthStart, end: tomorrow },
  } satisfies Record<AnalyticsRangeKey, { start: Date; end: Date }>;
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanPhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9+\-/ ]/g, " ")
    .replace(/\b(?:suspected|probable|acute|chronic|mild|moderate|severe)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function diagnosisTerms(value: string | null | undefined) {
  if (!value) return [];

  return value
    .split(/[,;\n|]+/)
    .map(cleanPhrase)
    .filter((term) => term.length >= 2)
    .map(titleCase);
}

export function symptomTerms(value: string | null | undefined) {
  if (!value) return [];

  return cleanPhrase(value)
    .split(/[,;\n|]+|\band\b|\bwith\b/)
    .map((phrase) =>
      phrase
        .split(" ")
        .filter((word) => word.length > 2 && !COMMON_SYMPTOM_WORDS.has(word))
        .join(" ")
        .trim()
    )
    .filter((term) => term.length >= 3)
    .map(titleCase);
}

function medicineName(value: string | null | undefined) {
  const name = cleanPhrase(value ?? "");
  return name ? titleCase(name) : null;
}

function ageGroup(age: number | null | undefined) {
  if (typeof age !== "number" || !Number.isFinite(age)) return "Unknown";
  return AGE_GROUPS.find((group) => age >= group.min && age <= group.max)?.label ?? "Unknown";
}

function addCount(map: Map<string, number>, key: string | null | undefined) {
  const normalized = key?.trim();
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function ranked(map: Map<string, number>, total: number, limit = 8): RankedMetric[] {
  return Array.from(map.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function buildClinicalAnalytics(
  prescriptions: PrescriptionForAnalytics[],
  now = new Date()
): ClinicalAnalyticsRange[] {
  const ranges = buildAnalyticsRanges(now);

  return (Object.keys(ranges) as AnalyticsRangeKey[]).map((key) => {
    const { start, end } = ranges[key];
    const inRange = prescriptions.filter((prescription) => {
      const createdAt = new Date(prescription.createdAt);
      return createdAt >= start && createdAt < end;
    });

    const patientKeys = new Set<string>();
    const diseaseCounts = new Map<string, number>();
    const symptomCounts = new Map<string, number>();
    const medicineCounts = new Map<string, number>();
    const ageCounts = new Map<string, number>();
    const genderCounts = new Map<string, number>();
    let revenue = 0;
    let followUps = 0;

    for (const prescription of inRange) {
      revenue += prescription.totalAmount ?? 0;
      if (prescription.followUpDate) followUps += 1;

      const patient = prescription.patient;
      if (patient) {
        patientKeys.add(prescription.patientId ?? `${patient.age}|${patient.gender}`);
        addCount(ageCounts, ageGroup(patient.age));
        addCount(genderCounts, patient.gender || "Unknown");
      }

      for (const term of diagnosisTerms(prescription.diagnosis)) {
        addCount(diseaseCounts, term);
      }

      for (const term of symptomTerms(prescription.symptoms)) {
        addCount(symptomCounts, term);
      }

      for (const medicine of prescription.medicines ?? []) {
        addCount(medicineCounts, medicineName(medicine.name));
      }
    }

    return {
      key,
      label: RANGE_LABELS[key],
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      prescriptions: inRange.length,
      uniquePatients: patientKeys.size,
      revenue,
      followUps,
      diseases: ranked(diseaseCounts, inRange.length),
      symptoms: ranked(symptomCounts, inRange.length),
      medicines: ranked(medicineCounts, inRange.length),
      ageGroups: ranked(ageCounts, inRange.length, 6),
      genderMix: ranked(genderCounts, inRange.length, 4),
    };
  });
}
