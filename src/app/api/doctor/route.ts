import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { doctorProfileSchema } from "@/lib/validators";

export async function PUT(request: Request) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = doctorProfileSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const doctor = await prisma.doctor.update({
      where: { id: doctorId },
      data: validated.data,
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

    return NextResponse.json(doctor);
  } catch (error) {
    console.error("Doctor update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
