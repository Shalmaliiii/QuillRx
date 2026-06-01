import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";

type Range = "daily" | "weekly" | "monthly";

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const dayLabel = (d: Date) => `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;

interface Bucket {
  date: string;
  label: string;
  count: number;
  revenue: number;
}

/**
 * Builds the empty buckets for a given range plus a function that maps a
 * prescription date to the matching bucket index (or -1 if out of range).
 */
function buildBuckets(range: Range, today: Date) {
  const buckets: Bucket[] = [];

  if (range === "monthly") {
    // Last 12 calendar months.
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      buckets.push({
        date: d.toISOString(),
        label: MONTH_LABELS[d.getMonth()],
        count: 0,
        revenue: 0,
      });
    }
    const start = new Date(base.getFullYear(), base.getMonth() - 11, 1);
    const indexFor = (date: Date) => {
      const diff =
        (date.getFullYear() - start.getFullYear()) * 12 +
        (date.getMonth() - start.getMonth());
      return diff >= 0 && diff < 12 ? diff : -1;
    };
    return { buckets, start, indexFor };
  }

  if (range === "weekly") {
    // Last 12 weeks (rolling 7-day windows ending today).
    const start = new Date(today);
    start.setDate(start.getDate() - 7 * 11);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + 7 * i);
      buckets.push({
        date: d.toISOString(),
        label: dayLabel(d),
        count: 0,
        revenue: 0,
      });
    }
    const indexFor = (date: Date) => {
      const days = Math.floor(
        (startOfDay(date).getTime() - start.getTime()) / 86_400_000
      );
      const idx = Math.floor(days / 7);
      return idx >= 0 && idx < 12 ? idx : -1;
    };
    return { buckets, start, indexFor };
  }

  // Daily — last 30 days.
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    buckets.push({
      date: d.toISOString(),
      label: dayLabel(d),
      count: 0,
      revenue: 0,
    });
  }
  const indexFor = (date: Date) => {
    const days = Math.floor(
      (startOfDay(date).getTime() - start.getTime()) / 86_400_000
    );
    return days >= 0 && days < 30 ? days : -1;
  };
  return { buckets, start, indexFor };
}

const RANGE_META: Record<Range, string> = {
  daily: "Last 30 days",
  weekly: "Last 12 weeks",
  monthly: "Last 12 months",
};

export async function GET(req: NextRequest) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const param = req.nextUrl.searchParams.get("range");
    const range: Range =
      param === "weekly" || param === "monthly" ? param : "daily";

    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);

    const { buckets, start: seriesStart, indexFor } = buildBuckets(range, today);

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

    for (const p of rangePrescriptions) {
      const idx = indexFor(new Date(p.createdAt));
      if (idx >= 0) {
        buckets[idx].count += 1;
        buckets[idx].revenue += p.totalAmount ?? 0;
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
      range,
      rangeLabel: RANGE_META[range],
      series: buckets,
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
