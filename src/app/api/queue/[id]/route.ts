import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import type { QueueStatus } from "@/types";

const VALID: QueueStatus[] = [
  "WAITING",
  "IN_PROGRESS",
  "DONE",
  "NO_SHOW",
  "CANCELLED",
];

// Doctor-side. Fetch a single queue entry (used for the current-visit context).
export async function GET(
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

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Queue get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Doctor-side. Update a queue entry's status.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const status = body?.status as QueueStatus;

    if (!VALID.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.queueEntry.findUnique({ where: { id } });
    if (!existing || existing.doctorId !== doctorId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const updated = await prisma.queueEntry.update({
      where: { id },
      data: {
        status,
        ...(status === "IN_PROGRESS" && !existing.calledAt
          ? { calledAt: new Date() }
          : {}),
        ...(status === "DONE" || status === "NO_SHOW" || status === "CANCELLED"
          ? { completedAt: new Date() }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Queue update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
