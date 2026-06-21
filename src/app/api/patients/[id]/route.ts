import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { patientSchema } from "@/lib/validators";
import { getPatientLabReports } from "@/lib/lab-reports";
import {
  buildPatientData,
  decryptPatientRecord,
  decryptPrescriptionRecord,
} from "@/lib/protected-health-data";
import { getDataPrivacySettings } from "@/lib/platform-settings";

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

    const patient = await prisma.patient.findFirst({
      where: { id, doctorId },
      include: {
        prescriptions: {
          orderBy: { createdAt: "desc" },
          include: { doctor: { select: { fullName: true, qualification: true } } },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const labReports = await getPatientLabReports(patient.id);
    const prescriptions = patient.prescriptions.map((prescription) =>
      decryptPrescriptionRecord(prescription, doctorId)
    );
    const decryptedPatient = decryptPatientRecord(patient, doctorId);

    return NextResponse.json({
      ...decryptedPatient,
      prescriptions,
      labReports,
    });
  } catch (error) {
    console.error("Patient get error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = patientSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.patient.findFirst({
      where: { id, doctorId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const privacySettings = await getDataPrivacySettings();
    const patient = await prisma.patient.update({
      where: { id },
      data: buildPatientData(validated.data, doctorId, id, privacySettings),
    });

    return NextResponse.json(decryptPatientRecord(patient, doctorId));
  } catch (error) {
    console.error("Patient update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.patient.findFirst({
      where: { id, doctorId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    await prisma.patient.delete({ where: { id } });
    return NextResponse.json({ message: "Patient deleted" });
  } catch (error) {
    console.error("Patient delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
