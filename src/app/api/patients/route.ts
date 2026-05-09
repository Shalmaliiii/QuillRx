import { NextResponse } from "next/server";
import { getCurrentDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const patients = await prisma.patient.findMany({
    where: {
      doctorId: doctor.id,
      OR: q
        ? [{ fullName: { contains: q, mode: "insensitive" } }, { phoneNumber: { contains: q } }]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(patients);
}

export async function POST(req: Request) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patientSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const patient = await prisma.patient.create({
    data: { ...parsed.data, doctorId: doctor.id },
  });
  return NextResponse.json(patient);
}
