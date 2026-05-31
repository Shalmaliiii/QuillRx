import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";

// Doctor-side. Begins a consultation for a queue entry:
//  - links to an existing patient by phone OR name match, or creates one
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

    let patientId = entry.patientId ?? null;
    let isNew = false;

    if (!patientId) {
      const orConditions = [];
      if (entry.phone) orConditions.push({ phone: entry.phone });
      if (entry.name) {
        orConditions.push({
          fullName: { equals: entry.name, mode: "insensitive" as const },
        });
      }

      if (orConditions.length > 0) {
        const match = await prisma.patient.findFirst({
          where: { doctorId, OR: orConditions },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });
        patientId = match?.id ?? null;
      }
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

    return NextResponse.json({ patientId, isNew });
  } catch (error) {
    console.error("Start consultation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
