import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  consoleForbiddenResponse,
  consoleUnauthorizedResponse,
  isConsoleIpAllowed,
  verifyConsoleRequest,
} from "@/lib/console-auth";
import {
  FIELD_ENCRYPTION_CONTROLS,
  getDataPrivacySettings,
} from "@/lib/platform-settings";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function buildMonthlyBuckets(today: Date) {
  const base = new Date(today.getFullYear(), today.getMonth(), 1);
  const buckets = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    buckets.push({
      date: d.toISOString(),
      label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
      doctors: 0,
      prescriptions: 0,
      patients: 0,
      revenue: 0,
    });
  }
  const start = new Date(base.getFullYear(), base.getMonth() - 11, 1);
  const indexFor = (date: Date) => {
    const diff =
      (date.getFullYear() - start.getFullYear()) * 12 +
      (date.getMonth() - start.getMonth());
    return diff >= 0 && diff < buckets.length ? diff : -1;
  };

  return { buckets, start, indexFor };
}

export async function GET(request: Request) {
  try {
    if (!isConsoleIpAllowed(request)) {
      return consoleForbiddenResponse();
    }

    if (!verifyConsoleRequest(request)) {
      return consoleUnauthorizedResponse();
    }

    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const last7 = new Date(today);
    last7.setDate(last7.getDate() - 6);
    const last30 = new Date(today);
    last30.setDate(last30.getDate() - 29);

    const { buckets, start: seriesStart, indexFor } = buildMonthlyBuckets(today);

    const [
      privacySettings,
      totalDoctors,
      doctorsThisMonth,
      activeDoctorIds,
      totalPatients,
      totalPrescriptions,
      prescriptionsToday,
      prescriptionsLast7,
      totalRevenue,
      queueEntries,
      completedQueueEntries,
      labReports,
      templates,
      encryptedPrescriptions,
      recentDoctors,
      seriesDoctors,
      seriesPatients,
      seriesPrescriptions,
      allDoctors,
      allPatients,
      allPrescriptionsForDoctors,
    ] = await Promise.all([
      getDataPrivacySettings(),
      prisma.doctor.count(),
      prisma.doctor.count({
        where: {
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
      }),
      prisma.prescription.findMany({
        where: { createdAt: { gte: last30 } },
        select: { doctorId: true },
        distinct: ["doctorId"],
      }),
      prisma.patient.count(),
      prisma.prescription.count(),
      prisma.prescription.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.prescription.count({ where: { createdAt: { gte: last7 } } }),
      prisma.prescription.aggregate({ _sum: { totalAmount: true } }),
      prisma.queueEntry.count(),
      prisma.queueEntry.count({
        where: { status: { in: ["DONE", "NO_SHOW", "CANCELLED"] } },
      }),
      prisma.labReport.count(),
      prisma.prescriptionTemplate.count(),
      prisma.prescription.count({ where: { encryptionVersion: 1 } }),
      prisma.doctor.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          fullName: true,
          email: true,
          clinicName: true,
          specialization: true,
          createdAt: true,
        },
      }),
      prisma.doctor.findMany({
        where: { createdAt: { gte: seriesStart } },
        select: { createdAt: true },
      }),
      prisma.patient.findMany({
        where: { createdAt: { gte: seriesStart } },
        select: { createdAt: true },
      }),
      prisma.prescription.findMany({
        where: { createdAt: { gte: seriesStart } },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.doctor.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          clinicName: true,
          specialization: true,
          createdAt: true,
        },
      }),
      prisma.patient.findMany({
        select: { doctorId: true },
      }),
      prisma.prescription.findMany({
        select: { doctorId: true, totalAmount: true, createdAt: true },
      }),
    ]);

    for (const doctor of seriesDoctors) {
      const idx = indexFor(doctor.createdAt);
      if (idx >= 0) buckets[idx].doctors += 1;
    }

    for (const patient of seriesPatients) {
      const idx = indexFor(patient.createdAt);
      if (idx >= 0) buckets[idx].patients += 1;
    }

    for (const prescription of seriesPrescriptions) {
      const idx = indexFor(prescription.createdAt);
      if (idx >= 0) {
        buckets[idx].prescriptions += 1;
        buckets[idx].revenue += prescription.totalAmount ?? 0;
      }
    }

    const patientCounts = new Map<string, number>();
    for (const patient of allPatients) {
      patientCounts.set(patient.doctorId, (patientCounts.get(patient.doctorId) ?? 0) + 1);
    }

    const prescriptionStats = new Map<
      string,
      { prescriptions: number; revenue: number; lastActivity: Date | null }
    >();
    for (const prescription of allPrescriptionsForDoctors) {
      const current =
        prescriptionStats.get(prescription.doctorId) ??
        { prescriptions: 0, revenue: 0, lastActivity: null };
      current.prescriptions += 1;
      current.revenue += prescription.totalAmount ?? 0;
      if (
        !current.lastActivity ||
        prescription.createdAt.getTime() > current.lastActivity.getTime()
      ) {
        current.lastActivity = prescription.createdAt;
      }
      prescriptionStats.set(prescription.doctorId, current);
    }

    const topDoctors = allDoctors
      .map((doctor) => {
        const stats = prescriptionStats.get(doctor.id) ?? {
          prescriptions: 0,
          revenue: 0,
          lastActivity: null,
        };
        return {
          id: doctor.id,
          name: doctor.fullName,
          email: doctor.email,
          clinicName: doctor.clinicName,
          specialization: doctor.specialization,
          patients: patientCounts.get(doctor.id) ?? 0,
          prescriptions: stats.prescriptions,
          revenue: stats.revenue,
          lastActivity: stats.lastActivity?.toISOString() ?? null,
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.prescriptions - a.prescriptions)
      .slice(0, 10);

    const activeDoctors30d = activeDoctorIds.length;
    const revenue = totalRevenue._sum.totalAmount ?? 0;

    return NextResponse.json({
      privacySettings,
      fieldDefinitions: FIELD_ENCRYPTION_CONTROLS,
      summary: {
        totalDoctors,
        doctorsThisMonth,
        activeDoctors30d,
        totalPatients,
        totalPrescriptions,
        prescriptionsToday,
        prescriptionsLast7,
        totalRevenue: revenue,
        avgRevenuePerDoctor: totalDoctors ? revenue / totalDoctors : 0,
        queueEntries,
        completedQueueEntries,
        labReports,
        templates,
        encryptedPrescriptions,
        plaintextPrescriptions: Math.max(0, totalPrescriptions - encryptedPrescriptions),
        clinicalEncryptionCoverage:
          totalPrescriptions > 0 ? encryptedPrescriptions / totalPrescriptions : 0,
      },
      series: buckets,
      topDoctors,
      recentDoctors: recentDoctors.map((doctor) => ({
        id: doctor.id,
        name: doctor.fullName,
        email: doctor.email,
        clinicName: doctor.clinicName,
        specialization: doctor.specialization,
        createdAt: doctor.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Console analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
