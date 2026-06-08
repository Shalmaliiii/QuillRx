import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { startOfToday } from "@/lib/queue";
import { attachLabReportsToQueueEntries } from "@/lib/lab-reports";

// Doctor-side. Returns today's queue for the authenticated doctor.
export async function GET() {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entries = await prisma.queueEntry.findMany({
      where: { doctorId, createdAt: { gte: startOfToday() } },
      orderBy: { createdAt: "asc" },
    });
    const entriesWithReports = await attachLabReportsToQueueEntries(entries);

    const counts = {
      waiting: entries.filter((e) => e.status === "WAITING").length,
      inProgress: entries.filter((e) => e.status === "IN_PROGRESS").length,
      done: entries.filter((e) => e.status === "DONE").length,
      total: entries.length,
    };

    return NextResponse.json({ entries: entriesWithReports, counts });
  } catch (error) {
    console.error("Queue list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
