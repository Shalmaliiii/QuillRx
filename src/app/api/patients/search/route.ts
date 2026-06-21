import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import {
  decryptPatientRecord,
  patientMatchesSearch,
} from "@/lib/protected-health-data";

export async function GET(request: Request) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const patients = await prisma.patient.findMany({
      where: { doctorId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      patients
        .map((patient) => decryptPatientRecord(patient, doctorId))
        .filter((patient) => patientMatchesSearch(patient, q))
        .slice(0, 10)
    );
  } catch (error) {
    console.error("Patient search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
