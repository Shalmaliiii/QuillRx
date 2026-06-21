import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { generatePrescriptionPDF } from "@/lib/pdf-generator";
import type { PrescriptionData, DoctorProfile } from "@/types";
import { decryptPrescriptionRecord } from "@/lib/protected-health-data";

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

    const prescription = await prisma.prescription.findFirst({
      where: { id, doctorId },
      include: {
        patient: true,
        doctor: {
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
        },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      );
    }

    const decryptedPrescription = decryptPrescriptionRecord(
      prescription,
      doctorId
    );
    const patient = decryptedPrescription.patient;

    const prescriptionData: PrescriptionData = {
      ...decryptedPrescription,
      followUpDate: prescription.followUpDate?.toISOString() ?? null,
      createdAt: prescription.createdAt.toISOString(),
      updatedAt: prescription.updatedAt.toISOString(),
      patient: patient
        ? {
            ...patient,
            createdAt: new Date(patient.createdAt as Date).toISOString(),
            updatedAt: new Date(patient.updatedAt as Date).toISOString(),
          }
        : undefined,
    } as PrescriptionData;

    const pdfBytes = await generatePrescriptionPDF(
      prescriptionData,
      prescription.doctor as unknown as DoctorProfile
    );

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="prescription-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
