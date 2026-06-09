import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";

type PatientMatchCandidate = {
  id: string;
  fullName: string;
  phone: string;
  age: number;
  gender: string;
  updatedAt: Date;
};

type QueueMatchInput = {
  name: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
};

function normalizeName(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizePhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(-10);
  return digits.replace(/^0+/, "");
}

function matchesQueuePatient(
  patient: Pick<PatientMatchCandidate, "fullName" | "phone">,
  entry: QueueMatchInput
) {
  const entryName = normalizeName(entry.name);
  const entryPhone = normalizePhone(entry.phone);
  if (!entryName || !entryPhone) return false;

  return (
    normalizeName(patient.fullName) === entryName &&
    normalizePhone(patient.phone) === entryPhone
  );
}

function candidateScore(candidate: PatientMatchCandidate, entry: QueueMatchInput) {
  let score = 0;
  if (entry.age != null && candidate.age === entry.age) score += 1;
  if (
    entry.gender &&
    candidate.gender.toLowerCase() === entry.gender.toLowerCase()
  ) {
    score += 1;
  }
  return score;
}

// Doctor-side. Begins a consultation for a queue entry:
//  - links to an existing patient only when name and phone both match, or creates one
//  - marks the entry IN_PROGRESS
//  - returns { patientId, isNew } so the client can open the patient record
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const entry = await prisma.queueEntry.findUnique({ where: { id } });
    if (!entry || entry.doctorId !== doctorId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const queueIdentity: QueueMatchInput = {
      name: entry.name,
      phone: entry.phone,
      age: entry.age,
      gender: entry.gender,
    };
    let patientId = entry.patientId ?? null;
    let isNew = false;

    if (patientId) {
      const linked = await prisma.patient.findFirst({
        where: { id: patientId, doctorId },
        select: {
          id: true,
          fullName: true,
          phone: true,
          age: true,
          gender: true,
          updatedAt: true,
        },
      });

      if (!linked || !matchesQueuePatient(linked, queueIdentity)) {
        patientId = null;
      }
    }

    if (!patientId) {
      const candidates = await prisma.patient.findMany({
        where: {
          doctorId,
          fullName: { equals: entry.name, mode: "insensitive" },
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          age: true,
          gender: true,
          updatedAt: true,
        },
        take: 50,
      });

      const match = candidates
        .filter((patient) => matchesQueuePatient(patient, queueIdentity))
        .sort((a, b) => {
          const scoreDiff =
            candidateScore(b, queueIdentity) - candidateScore(a, queueIdentity);
          if (scoreDiff !== 0) return scoreDiff;
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        })[0];
      patientId = match?.id ?? null;
    }

    if (!patientId) {
      const created = await prisma.patient.create({
        data: {
          doctorId,
          fullName: entry.name,
          age: entry.age ?? 0,
          gender: entry.gender ?? "Other",
          phone: entry.phone ?? "",
        },
        select: { id: true },
      });
      patientId = created.id;
      isNew = true;
    }

    await prisma.queueEntry.update({
      where: { id },
      data: {
        patientId,
        status: "IN_PROGRESS",
        ...(entry.calledAt ? {} : { calledAt: new Date() }),
      },
    });

    try {
      await prisma.labReport.updateMany({
        where: { queueEntryId: id, doctorId },
        data: { patientId },
      });
    } catch (error) {
      console.error("Lab report patient link error:", error);
    }

    return NextResponse.json({ patientId, isNew });
  } catch (error) {
    console.error("Start consultation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
