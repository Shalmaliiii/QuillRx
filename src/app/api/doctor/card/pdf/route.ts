import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { generateDoctorCardPDF } from "@/lib/doctor-card-pdf";
import type { DoctorProfile } from "@/types";

export async function GET() {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        email: true,
        fullName: true,
        qualification: true,
        registrationNumber: true,
        specialization: true,
        mobileNumber: true,
        clinicName: true,
        clinicAddress: true,
        consultationTimings: true,
        clinicPhone: true,
        signatureUrl: true,
        logoUrl: true,
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const pdfBytes = await generateDoctorCardPDF(
      doctor as unknown as DoctorProfile
    );

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="doctor-card.pdf"`,
      },
    });
  } catch (error) {
    console.error("Doctor card PDF error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
