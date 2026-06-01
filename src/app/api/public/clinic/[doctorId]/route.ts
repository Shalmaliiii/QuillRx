import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public, unauthenticated. Returns only clinic-safe fields for the intake page.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const { doctorId } = await params;
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        fullName: true,
        qualification: true,
        specialization: true,
        clinicName: true,
        clinicAddress: true,
        logoUrl: true,
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    return NextResponse.json(doctor);
  } catch {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }
}
