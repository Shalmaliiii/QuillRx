import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getCurrentDoctor } from "@/lib/auth";
import { generatePrescriptionPdf } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";
import { prescriptionSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = prescriptionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, doctorId: doctor.id },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const total = Math.max(
    0,
    parsed.data.consultationFee + parsed.data.additionalCharges - parsed.data.discount,
  );
  const secureToken = nanoid(16);

  const created = await prisma.prescription.create({
    data: {
      doctorId: doctor.id,
      patientId: patient.id,
      symptoms: parsed.data.symptoms,
      diagnosis: parsed.data.diagnosis,
      bp: parsed.data.bp,
      temperature: parsed.data.temperature,
      weight: parsed.data.weight,
      pulse: parsed.data.pulse,
      advice: parsed.data.advice,
      labTests: parsed.data.labTests,
      followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null,
      consultationFee: parsed.data.consultationFee,
      additionalCharges: parsed.data.additionalCharges,
      discount: parsed.data.discount,
      totalPayable: total,
      secureToken,
      medicines: { create: parsed.data.medicines.map((m) => ({ ...m })) },
    },
    include: { medicines: true },
  });

  const pdf = await generatePrescriptionPdf({
    clinicName: doctor.clinicName,
    clinicAddress: doctor.clinicAddress,
    clinicPhone: doctor.clinicPhone,
    doctorName: doctor.fullName,
    qualification: doctor.qualification,
    registrationNumber: doctor.registrationNumber,
    patientName: patient.fullName,
    age: patient.age,
    gender: patient.gender,
    date: new Date().toLocaleDateString("en-IN"),
    diagnosis: created.diagnosis ?? undefined,
    symptoms: created.symptoms ?? undefined,
    medicines: created.medicines.map((m) => ({
      name: m.name,
      timing: `${m.morning ? "M" : "-"}/${m.afternoon ? "A" : "-"}/${m.night ? "N" : "-"}`,
      duration: m.duration ?? undefined,
      instructions: m.instructions ?? undefined,
    })),
    advice: created.advice ?? undefined,
    followUpDate: created.followUpDate?.toLocaleDateString("en-IN"),
    fees: {
      consultationFee: created.consultationFee,
      additionalCharges: created.additionalCharges,
      discount: created.discount,
      totalPayable: created.totalPayable,
    },
  });

  const dir = path.join(process.cwd(), "public", "prescriptions");
  await mkdir(dir, { recursive: true });
  const fileName = `${secureToken}.pdf`;
  await writeFile(path.join(dir, fileName), pdf);
  const pdfUrl = `/prescriptions/${fileName}`;
  await prisma.prescription.update({ where: { id: created.id }, data: { pdfUrl } });

  return NextResponse.json({ ok: true, publicUrl: `/rx/${secureToken}`, pdfUrl });
}
