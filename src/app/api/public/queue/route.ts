import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { queueIntakeSchema } from "@/lib/validators";
import { nextTokenNumber, peopleAhead } from "@/lib/queue";

// Public, unauthenticated. A patient joins a doctor's queue via the QR link.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const doctorId = typeof body?.doctorId === "string" ? body.doctorId : "";

    if (!doctorId) {
      return NextResponse.json({ error: "Missing clinic reference" }, { status: 400 });
    }

    const validated = queueIntakeSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, clinicName: true },
    });
    if (!doctor) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    const tokenNumber = await nextTokenNumber(doctorId);
    const data = validated.data;

    const entry = await prisma.queueEntry.create({
      data: {
        doctorId,
        name: data.name,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        reason: data.reason,
        duration: data.duration || null,
        severity: data.severity || null,
        notes: data.notes || null,
        tokenNumber,
        status: "WAITING",
        source: "qr",
      },
    });

    const ahead = await peopleAhead(doctorId, entry.createdAt);

    return NextResponse.json(
      {
        id: entry.id,
        tokenNumber: entry.tokenNumber,
        peopleAhead: ahead,
        clinicName: doctor.clinicName,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Queue join error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
