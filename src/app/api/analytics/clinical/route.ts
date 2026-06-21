import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { buildAnalyticsRanges, buildClinicalAnalytics } from "@/lib/clinical-analytics";
import { decryptPrescriptionRecord } from "@/lib/protected-health-data";

export async function GET() {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ranges = buildAnalyticsRanges();
    const prescriptions = await prisma.prescription.findMany({
      where: {
        doctorId,
        createdAt: {
          gte: ranges.month.start,
          lt: ranges.month.end,
        },
      },
      include: {
        patient: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const decrypted = prescriptions.map((prescription) =>
      decryptPrescriptionRecord(prescription, doctorId)
    );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      ranges: buildClinicalAnalytics(decrypted),
    });
  } catch (error) {
    console.error("Clinical analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
