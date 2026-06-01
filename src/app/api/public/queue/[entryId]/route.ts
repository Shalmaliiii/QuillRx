import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { peopleAhead, estimateWaitMinutes } from "@/lib/queue";

// Public, unauthenticated. A patient polls their live position/status.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const clinic = await prisma.doctor.findUnique({
      where: { id: entry.doctorId },
      select: { clinicName: true, fullName: true },
    });

    const ahead =
      entry.status === "WAITING" || entry.status === "IN_PROGRESS"
        ? await peopleAhead(entry.doctorId, entry.createdAt)
        : 0;

    const estimatedWaitMinutes =
      entry.status === "WAITING"
        ? await estimateWaitMinutes(entry.doctorId, ahead)
        : null;

    return NextResponse.json({
      id: entry.id,
      tokenNumber: entry.tokenNumber,
      status: entry.status,
      peopleAhead: ahead,
      estimatedWaitMinutes,
      name: entry.name,
      reason: entry.reason,
      createdAt: entry.createdAt,
      clinicName: clinic?.clinicName ?? null,
      doctorName: clinic?.fullName ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
}
