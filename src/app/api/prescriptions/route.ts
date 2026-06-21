import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { prescriptionSchema } from "@/lib/validators";
import { buildSearchText, type MedicineCatalogEntry } from "@/lib/medicine-catalog";
import { generateObjectId } from "@/lib/envelope-encryption";
import {
  buildPatientData,
  buildPrescriptionData,
  decryptPatientRecord,
  decryptPrescriptionRecord,
  patientMatchesSearch,
} from "@/lib/protected-health-data";
import { getDataPrivacySettings } from "@/lib/platform-settings";

type PrescribedMedicine = {
  name: string;
  strength?: string | null;
};

function normalizeMedicineText(value?: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeGender(value: string): "Male" | "Female" | "Other" {
  return value === "Male" || value === "Female" || value === "Other"
    ? value
    : "Other";
}

async function savePrescribedMedicines(medicines: PrescribedMedicine[]) {
  const seen = new Set<string>();

  for (const medicine of medicines) {
    const genericName = normalizeMedicineText(medicine.name);
    const strength = normalizeMedicineText(medicine.strength) || null;
    if (genericName.length < 2) continue;

    const key = `${genericName.toLowerCase()}|${(strength ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const matches = await prisma.medicineCatalog.findMany({
      where: { searchText: { contains: genericName.toLowerCase() } },
      take: 30,
    });

    const existing = matches.find((catalogMedicine) => {
      const sameName =
        catalogMedicine.genericName.toLowerCase() === genericName.toLowerCase();
      const sameStrength =
        (catalogMedicine.strength ?? "").toLowerCase() ===
        (strength ?? "").toLowerCase();
      return sameName && sameStrength;
    });

    if (existing) continue;

    const entry: MedicineCatalogEntry = {
      genericName,
      strength,
      source: "doctor",
    };

    await prisma.medicineCatalog.create({
      data: {
        genericName,
        strength,
        source: "doctor",
        searchText: buildSearchText(entry),
      },
    });
  }
}

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
      const patients = await prisma.patient.findMany({ where: { doctorId } });
      const matchingIds = patients
        .map((patient) => decryptPatientRecord(patient, doctorId))
        .filter(
          (patient) => patientMatchesSearch(patient, q)
        )
        .map((patient) => patient.id);

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

    return NextResponse.json({
      prescriptions: prescriptions.map((prescription) =>
        decryptPrescriptionRecord(prescription, doctorId)
      ),
      total,
      page,
      limit,
    });
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

    const privacySettings = await getDataPrivacySettings();
    const knownAllergies = rest.knownAllergies?.trim();
    if (knownAllergies) {
      const decryptedPatient = decryptPatientRecord(patient, doctorId);
      if (decryptedPatient.allergies?.trim() !== knownAllergies) {
        await prisma.patient.update({
          where: { id: patientId },
          data: buildPatientData(
            {
              fullName: decryptedPatient.fullName,
              age: decryptedPatient.age,
              gender: normalizeGender(decryptedPatient.gender),
              phone: decryptedPatient.phone,
              weight: decryptedPatient.weight ?? undefined,
              bp: decryptedPatient.bp ?? undefined,
              diabetesStatus: decryptedPatient.diabetesStatus ?? undefined,
              allergies: knownAllergies,
              existingConditions: decryptedPatient.existingConditions ?? undefined,
            },
            doctorId,
            patientId,
            privacySettings
          ),
        });
      }
    }

    const totalAmount =
      (rest.consultationFee || 0) +
      (rest.additionalCharges || 0) -
      (rest.discount || 0);

    const prescriptionId = generateObjectId();
    const prescription = await prisma.prescription.create({
      data: {
        id: prescriptionId,
        ...buildPrescriptionData(rest, doctorId, prescriptionId, {
          fieldEncryption: privacySettings.fieldEncryption,
        }),
        patientId,
        doctorId,
        consultationMode: rest.consultationMode,
        consultationFee: rest.consultationFee,
        additionalCharges: rest.additionalCharges,
        discount: rest.discount,
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

    try {
      await savePrescribedMedicines(rest.medicines);
    } catch (error) {
      console.error("Medicine catalog save error:", error);
    }

    return NextResponse.json(decryptPrescriptionRecord(prescription, doctorId), {
      status: 201,
    });
  } catch (error) {
    console.error("Prescription create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
