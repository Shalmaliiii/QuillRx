import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { patientCreateSchema, type PatientInput } from "@/lib/validators";
import { generateObjectId } from "@/lib/envelope-encryption";
import {
  buildPatientData,
  decryptPatientRecord,
  decryptPrescriptionRecord,
  normalizeName,
  normalizePhone,
} from "@/lib/protected-health-data";
import { getDataPrivacySettings } from "@/lib/platform-settings";

async function findKnownAllergiesFromPriorPrescriptions(
  doctorId: string,
  patient: Pick<PatientInput, "fullName" | "phone">
) {
  const targetName = normalizeName(patient.fullName);
  const targetPhone = normalizePhone(patient.phone);
  const candidates = await prisma.patient.findMany({
    where: { doctorId },
    include: {
      prescriptions: {
        select: {
          id: true,
          doctorId: true,
          symptoms: true,
          diagnosis: true,
          knownAllergies: true,
          vitals: true,
          medicines: true,
          labTests: true,
          advice: true,
          encryptedData: true,
          encryptionVersion: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const match = candidates
    .map((candidate) => {
      const decryptedPatient = decryptPatientRecord(candidate, doctorId);
      const prescriptionAllergies = candidate.prescriptions
        .map(
          (prescription) =>
            decryptPrescriptionRecord(prescription, doctorId).knownAllergies?.trim()
        )
        .find(Boolean);

      return {
        patient: decryptedPatient,
        allergies: prescriptionAllergies || decryptedPatient.allergies?.trim(),
      };
    })
    .filter(({ patient, allergies }) => {
      if (!allergies || patient.prescriptions.length === 0) {
        return false;
      }

      return (
        (targetPhone && normalizePhone(patient.phone) === targetPhone) ||
        normalizeName(patient.fullName) === targetName
      );
    })
    .sort((a, b) => {
      const aDate = a.patient.prescriptions[0]?.createdAt ?? a.patient.updatedAt;
      const bDate = b.patient.prescriptions[0]?.createdAt ?? b.patient.updatedAt;
      return +new Date(bDate as Date) - +new Date(aDate as Date);
    })[0];

  return match?.allergies || undefined;
}

export async function GET() {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patients = await prisma.patient.findMany({
      where: { doctorId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      patients.map((patient) => decryptPatientRecord(patient, doctorId))
    );
  } catch (error) {
    console.error("Patients list error:", error);
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
    const validated = patientCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const knownAllergies = await findKnownAllergiesFromPriorPrescriptions(
      doctorId,
      validated.data
    );
    const patientInput: PatientInput = {
      ...validated.data,
      allergies: knownAllergies,
    };
    const privacySettings = await getDataPrivacySettings();
    const patientId = generateObjectId();
    const patient = await prisma.patient.create({
      data: {
        id: patientId,
        doctorId,
        ...buildPatientData(patientInput, doctorId, patientId, privacySettings),
      },
    });

    return NextResponse.json(decryptPatientRecord(patient, doctorId), {
      status: 201,
    });
  } catch (error) {
    console.error("Patient create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
