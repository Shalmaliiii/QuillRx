import type { PatientInput, PrescriptionInput } from "@/lib/validators";
import { decryptJson, encryptJson } from "@/lib/envelope-encryption";
import {
  DEFAULT_FIELD_ENCRYPTION,
  PRESCRIPTION_FIELD_IDS,
  type DataPrivacySettings,
  type FieldEncryptionId,
} from "@/lib/platform-settings";

const ENCRYPTED_TEXT = "[encrypted]";
const ENCRYPTION_VERSION = 1;

type PatientPayload = {
  fullName: string;
  age: number;
  gender: string;
  phone: string;
  weight: string | null;
  bp: string | null;
  diabetesStatus: string | null;
  allergies: string | null;
  existingConditions: string | null;
};

type VitalPayload = {
  bp: string | null;
  temperature: string | null;
  weight: string | null;
  pulse: string | null;
};

type MedicinePayload = {
  name: string;
  strength: string | null;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  beforeFood: boolean;
  duration: string | null;
  specialInstructions: string | null;
};

type PrescriptionPayload = {
  symptoms: string | null;
  diagnosis: string | null;
  knownAllergies: string | null;
  vitals: VitalPayload | null;
  medicines: MedicinePayload[];
  labTests: string | null;
  advice: string | null;
};

type PatientRecord = PatientPayload & {
  id: string;
  doctorId: string;
  encryptedData?: unknown | null;
  encryptionVersion?: number | null;
  [key: string]: unknown;
};

type PrescriptionRecord = {
  id: string;
  doctorId: string;
  symptoms?: string | null;
  diagnosis?: string | null;
  knownAllergies?: string | null;
  vitals?: VitalPayload | null;
  medicines?: MedicinePayload[];
  labTests?: string | null;
  advice?: string | null;
  encryptedData?: unknown | null;
  encryptionVersion?: number | null;
  patient?: PatientRecord | null;
  [key: string]: unknown;
};

type FieldEncryptionPolicy = Pick<DataPrivacySettings, "fieldEncryption">;

type DecryptedPatient<T extends PatientRecord> = Omit<
  T,
  "encryptedData" | "encryptionVersion"
> &
  PatientPayload;

type DecryptedPrescription<T extends PrescriptionRecord> = Omit<
  T,
  "encryptedData" | "encryptionVersion"
> &
  PrescriptionPayload & {
    patient?: DecryptedPatient<PatientRecord> | null;
  };

function nullable(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizePatientPayload(input: PatientInput): PatientPayload {
  return {
    fullName: input.fullName.trim(),
    age: input.age,
    gender: input.gender,
    phone: input.phone.trim(),
    weight: nullable(input.weight),
    bp: nullable(input.bp),
    diabetesStatus: nullable(input.diabetesStatus),
    allergies: nullable(input.allergies),
    existingConditions: nullable(input.existingConditions),
  };
}

function normalizePrescriptionPayload(
  input: Pick<
    PrescriptionInput,
    | "symptoms"
    | "diagnosis"
    | "knownAllergies"
    | "vitals"
    | "medicines"
    | "labTests"
    | "advice"
  >
): PrescriptionPayload {
  const vitals = input.vitals
    ? {
        bp: nullable(input.vitals.bp),
        temperature: nullable(input.vitals.temperature),
        weight: nullable(input.vitals.weight),
        pulse: nullable(input.vitals.pulse),
      }
    : null;

  return {
    symptoms: nullable(input.symptoms),
    diagnosis: nullable(input.diagnosis),
    knownAllergies: nullable(input.knownAllergies),
    vitals,
    medicines: input.medicines.map((medicine) => ({
      name: medicine.name.trim(),
      strength: nullable(medicine.strength),
      morning: medicine.morning,
      afternoon: medicine.afternoon,
      night: medicine.night,
      beforeFood: medicine.beforeFood,
      duration: nullable(medicine.duration),
      specialInstructions: nullable(medicine.specialInstructions),
    })),
    labTests: nullable(input.labTests),
    advice: nullable(input.advice),
  };
}

function stripEncryptionFields<T extends Record<string, unknown>>(record: T) {
  const safe = { ...record };
  delete safe.encryptedData;
  delete safe.encryptionVersion;
  return safe;
}

function isFieldEncrypted(
  policy: FieldEncryptionPolicy | undefined,
  id: FieldEncryptionId
) {
  if (id === "patient.fullName" || id === "patient.phone") {
    return true;
  }

  return (policy?.fieldEncryption ?? DEFAULT_FIELD_ENCRYPTION)[id] !== false;
}

function hasEncryptedPrescriptionFields(policy: FieldEncryptionPolicy | undefined) {
  return PRESCRIPTION_FIELD_IDS.some((id) => isFieldEncrypted(policy, id));
}

export function buildPatientData(
  input: PatientInput,
  doctorId: string,
  recordId: string,
  policy?: FieldEncryptionPolicy
) {
  const payload = normalizePatientPayload(input);

  return {
    fullName: ENCRYPTED_TEXT,
    age: isFieldEncrypted(policy, "patient.age") ? 0 : payload.age,
    gender: isFieldEncrypted(policy, "patient.gender") ? "Other" : payload.gender,
    phone: ENCRYPTED_TEXT,
    weight: isFieldEncrypted(policy, "patient.weight") ? null : payload.weight,
    bp: isFieldEncrypted(policy, "patient.bp") ? null : payload.bp,
    diabetesStatus: isFieldEncrypted(policy, "patient.diabetesStatus")
      ? null
      : payload.diabetesStatus,
    allergies: isFieldEncrypted(policy, "patient.allergies")
      ? null
      : payload.allergies,
    existingConditions: isFieldEncrypted(policy, "patient.existingConditions")
      ? null
      : payload.existingConditions,
    encryptedData: encryptJson(payload, {
      purpose: "patient",
      doctorId,
      recordId,
    }),
    encryptionVersion: ENCRYPTION_VERSION,
  };
}

export function buildEncryptedPatientData(
  input: PatientInput,
  doctorId: string,
  recordId: string
) {
  return buildPatientData(input, doctorId, recordId);
}

export function decryptPatientRecord<T extends PatientRecord>(
  record: T,
  doctorId = record.doctorId
): DecryptedPatient<T> {
  const safe = stripEncryptionFields(record);

  if (!record.encryptedData) {
    return safe as DecryptedPatient<T>;
  }

  const decrypted = decryptJson<PatientPayload>(record.encryptedData, {
    purpose: "patient",
    doctorId,
    recordId: record.id,
  });

  return {
    ...safe,
    ...decrypted,
  } as DecryptedPatient<T>;
}

export function buildEncryptedPrescriptionData(
  input: Pick<
    PrescriptionInput,
    | "symptoms"
    | "diagnosis"
    | "knownAllergies"
    | "vitals"
    | "medicines"
    | "labTests"
    | "advice"
  >,
  doctorId: string,
  recordId: string
) {
  return {
    symptoms: null,
    diagnosis: null,
    knownAllergies: null,
    vitals: null,
    medicines: [],
    labTests: null,
    advice: null,
    encryptedData: encryptJson(normalizePrescriptionPayload(input), {
      purpose: "prescription",
      doctorId,
      recordId,
    }),
    encryptionVersion: ENCRYPTION_VERSION,
  };
}

export function buildPrescriptionData(
  input: Pick<
    PrescriptionInput,
    | "symptoms"
    | "diagnosis"
    | "knownAllergies"
    | "vitals"
    | "medicines"
    | "labTests"
    | "advice"
  >,
  doctorId: string,
  recordId: string,
  options: {
    fieldEncryption?: Record<FieldEncryptionId, boolean>;
    encryptClinicalData?: boolean;
  }
) {
  const payload = normalizePrescriptionPayload(input);
  const fieldEncryption =
    options.fieldEncryption ??
    (options.encryptClinicalData === false
      ? PRESCRIPTION_FIELD_IDS.reduce(
          (acc, id) => {
            acc[id] = false;
            return acc;
          },
          { ...DEFAULT_FIELD_ENCRYPTION }
        )
      : DEFAULT_FIELD_ENCRYPTION);
  const policy = { fieldEncryption };
  const hasEncryptedFields = hasEncryptedPrescriptionFields(policy);

  return {
    symptoms: isFieldEncrypted(policy, "prescription.symptoms")
      ? null
      : payload.symptoms,
    diagnosis: isFieldEncrypted(policy, "prescription.diagnosis")
      ? null
      : payload.diagnosis,
    knownAllergies: isFieldEncrypted(policy, "prescription.knownAllergies")
      ? null
      : payload.knownAllergies,
    vitals: isFieldEncrypted(policy, "prescription.vitals")
      ? null
      : payload.vitals,
    medicines: isFieldEncrypted(policy, "prescription.medicines")
      ? []
      : payload.medicines,
    labTests: isFieldEncrypted(policy, "prescription.labTests")
      ? null
      : payload.labTests,
    advice: isFieldEncrypted(policy, "prescription.advice")
      ? null
      : payload.advice,
    encryptedData: hasEncryptedFields
      ? encryptJson(payload, {
          purpose: "prescription",
          doctorId,
          recordId,
        })
      : null,
    encryptionVersion: hasEncryptedFields ? ENCRYPTION_VERSION : 0,
  };
}

export function decryptPrescriptionRecord<T extends PrescriptionRecord>(
  record: T,
  doctorId = record.doctorId
): DecryptedPrescription<T> {
  const { patient, ...recordWithoutPatient } = record;
  const safe = stripEncryptionFields(recordWithoutPatient);
  const decrypted = record.encryptedData
    ? decryptJson<PrescriptionPayload>(record.encryptedData, {
        purpose: "prescription",
        doctorId,
        recordId: record.id,
      })
    : {};

  const result = {
    ...safe,
    ...decrypted,
  };

  if ("patient" in record) {
    return {
      ...result,
      patient: patient ? decryptPatientRecord(patient, doctorId) : patient,
    } as unknown as DecryptedPrescription<T>;
  }

  return result as unknown as DecryptedPrescription<T>;
}

export function normalizeName(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizePhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(-10);
  return digits.replace(/^0+/, "");
}

export function patientMatchesSearch(
  patient: Pick<PatientPayload, "fullName" | "phone">,
  search: string
) {
  const nameQuery = normalizeName(search);
  const phoneQuery = normalizePhone(search);
  if (!nameQuery && !phoneQuery) return true;

  const patientName = normalizeName(patient.fullName);
  const patientNameTokens = patientName.split(" ").filter(Boolean);
  const patientPhone = normalizePhone(patient.phone);

  if (phoneQuery.length >= 3 && patientPhone.includes(phoneQuery)) {
    return true;
  }

  if (nameQuery.length < 2) return false;

  if (nameQuery.length <= 2) {
    return patientNameTokens.some((token) => token.startsWith(nameQuery));
  }

  return patientName.includes(nameQuery);
}
