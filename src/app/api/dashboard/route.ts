import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";

export async function GET() {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayPrescriptions, totalConsultations, pendingFollowUps, recentPrescriptions] =
      await Promise.all([
        prisma.prescription.count({
          where: {
            doctorId,
            createdAt: { gte: today, lt: tomorrow },
          },
        }),
        prisma.prescription.count({ where: { doctorId } }),
        prisma.prescription.count({
          where: {
            doctorId,
            followUpDate: { gte: today },
          },
        }),
        prisma.prescription.findMany({
          where: { doctorId },
          include: { patient: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    return NextResponse.json({
      todayPatients: todayPrescriptions,
      totalConsultations,
      pendingFollowUps,
      recentPrescriptions,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
