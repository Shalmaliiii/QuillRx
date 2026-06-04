import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { prescriptionSchema } from "@/lib/validators";

type PrescriptionPatientSearchRow = {
  id: string;
  fullName: string;
  phone: string;
};

export async function GET(request: Request) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const patientId = searchParams.get("patientId");
    const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

    const where: Record<string, unknown> = { doctorId };
    if (patientId) where.patientId = patientId;

    if (q) {
      const patients: PrescriptionPatientSearchRow[] = await prisma.patient.findMany({
        where: { doctorId },
        select: { id: true, fullName: true, phone: true },
      });
      const matchingIds = patients
        .filter(
          (p) =>
            p.fullName.toLowerCase().includes(q) || p.phone.includes(q)
        )
        .map((p) => p.id);

      if (matchingIds.length === 0) {
        return NextResponse.json({ prescriptions: [], total: 0, page, limit });
      }

      where.patientId = { in: matchingIds };
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: {
          patient: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.prescription.count({ where }),
    ]);

    return NextResponse.json({ prescriptions, total, page, limit });
  } catch (error) {
    console.error("Prescriptions list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = prescriptionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { patientId, followUpDate, ...rest } = validated.data;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, doctorId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    const totalAmount =
      (rest.consultationFee || 0) +
      (rest.additionalCharges || 0) -
      (rest.discount || 0);

    const prescription = await prisma.prescription.create({
      data: {
        ...rest,
        patientId,
        doctorId,
        totalAmount: Math.max(0, totalAmount),
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
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

    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    console.error("Prescription create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
