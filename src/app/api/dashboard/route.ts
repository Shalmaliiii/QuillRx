import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";

const SERIES_DAYS = 30;

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

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);

    const seriesStart = new Date(today);
    seriesStart.setDate(seriesStart.getDate() - (SERIES_DAYS - 1));

    const [
      todayPrescriptions,
      totalConsultations,
      pendingFollowUps,
      totalPatients,
      thisWeekConsultations,
      revenueAgg,
      rangePrescriptions,
      upcomingFollowUps,
      recentPrescriptions,
    ] = await Promise.all([
      prisma.prescription.count({
        where: { doctorId, createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.prescription.count({ where: { doctorId } }),
      prisma.prescription.count({
        where: { doctorId, followUpDate: { gte: today } },
      }),
      prisma.patient.count({ where: { doctorId } }),
      prisma.prescription.count({
        where: { doctorId, createdAt: { gte: weekStart } },
      }),
      prisma.prescription.aggregate({
        where: { doctorId },
        _sum: { totalAmount: true },
        _avg: { consultationFee: true },
      }),
      prisma.prescription.findMany({
        where: { doctorId, createdAt: { gte: seriesStart } },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.prescription.findMany({
        where: { doctorId, followUpDate: { gte: today } },
        include: { patient: true },
        orderBy: { followUpDate: "asc" },
        take: 6,
      }),
      prisma.prescription.findMany({
        where: { doctorId },
        include: { patient: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    const series: Array<{ date: string; count: number; revenue: number }> = [];
    const keyToIndex = new Map<string, number>();
    for (let i = SERIES_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      keyToIndex.set(dayKey(d), series.length);
      series.push({ date: d.toISOString(), count: 0, revenue: 0 });
    }
    for (const p of rangePrescriptions) {
      const idx = keyToIndex.get(dayKey(new Date(p.createdAt)));
      if (idx !== undefined) {
        series[idx].count += 1;
        series[idx].revenue += p.totalAmount ?? 0;
      }
    }

    return NextResponse.json({
      todayPatients: todayPrescriptions,
      totalConsultations,
      pendingFollowUps,
      totalPatients,
      thisWeekConsultations,
      totalRevenue: revenueAgg._sum.totalAmount ?? 0,
      avgConsultationFee: revenueAgg._avg.consultationFee ?? 0,
      series,
      upcomingFollowUps,
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
