import { prisma } from "@/lib/db";

const PRIVACY_SETTING_KEY = "data_privacy";

export const FIELD_ENCRYPTION_CONTROLS = [
  {
    id: "patient.fullName",
    label: "Patient name",
    group: "Patient identifiers",
    mandatory: true,
    description: "Direct patient identifier. Always encrypted.",
  },
  {
    id: "patient.phone",
    label: "Patient phone",
    group: "Patient identifiers",
    mandatory: true,
    description: "Direct contact identifier. Always encrypted.",
  },
  {
    id: "patient.age",
    label: "Patient age",
    group: "Patient demographics",
    mandatory: false,
    description: "Demographic value used in patient records and prescriptions.",
  },
  {
    id: "patient.gender",
    label: "Patient gender",
    group: "Patient demographics",
    mandatory: false,
    description: "Demographic value used in patient records and prescriptions.",
  },
  {
    id: "patient.weight",
    label: "Patient weight",
    group: "Patient clinical profile",
    mandatory: false,
    description: "Clinical profile value copied from patient records.",
  },
  {
    id: "patient.bp",
    label: "Patient blood pressure",
    group: "Patient clinical profile",
    mandatory: false,
    description: "Clinical profile value copied from patient records.",
  },
  {
    id: "patient.diabetesStatus",
    label: "Patient diabetes status",
    group: "Patient clinical profile",
    mandatory: false,
    description: "Condition marker visible on patient history.",
  },
  {
    id: "patient.allergies",
    label: "Patient allergies",
    group: "Patient clinical profile",
    mandatory: false,
    description: "Known allergies stored on the patient profile.",
  },
  {
    id: "patient.existingConditions",
    label: "Existing conditions",
    group: "Patient clinical profile",
    mandatory: false,
    description: "Known medical conditions stored on the patient profile.",
  },
  {
    id: "prescription.symptoms",
    label: "Symptoms",
    group: "Prescription clinical data",
    mandatory: false,
    description: "Patient complaints and symptoms.",
  },
  {
    id: "prescription.diagnosis",
    label: "Diagnosis",
    group: "Prescription clinical data",
    mandatory: false,
    description: "Clinical diagnosis entered by the doctor.",
  },
  {
    id: "prescription.knownAllergies",
    label: "Prescription allergies",
    group: "Prescription clinical data",
    mandatory: false,
    description: "Allergy note captured during prescription creation.",
  },
  {
    id: "prescription.vitals",
    label: "Vitals",
    group: "Prescription clinical data",
    mandatory: false,
    description: "BP, temperature, weight, and pulse.",
  },
  {
    id: "prescription.medicines",
    label: "Medicines",
    group: "Prescription clinical data",
    mandatory: false,
    description: "Medicine names, strength, dosage, and instructions.",
  },
  {
    id: "prescription.labTests",
    label: "Lab tests",
    group: "Prescription clinical data",
    mandatory: false,
    description: "Recommended investigations.",
  },
  {
    id: "prescription.advice",
    label: "Advice",
    group: "Prescription clinical data",
    mandatory: false,
    description: "Doctor advice and care instructions.",
  },
] as const;

export type FieldEncryptionId = (typeof FIELD_ENCRYPTION_CONTROLS)[number]["id"];

export type DataPrivacySettings = {
  encryptClinicalPrescriptionData: boolean;
  fieldEncryption: Record<FieldEncryptionId, boolean>;
};

export const DEFAULT_FIELD_ENCRYPTION = FIELD_ENCRYPTION_CONTROLS.reduce(
  (acc, control) => {
    acc[control.id] = true;
    return acc;
  },
  {} as Record<FieldEncryptionId, boolean>
);

const DEFAULT_PRIVACY_SETTINGS: DataPrivacySettings = {
  encryptClinicalPrescriptionData: true,
  fieldEncryption: DEFAULT_FIELD_ENCRYPTION,
};

export const PRESCRIPTION_FIELD_IDS = FIELD_ENCRYPTION_CONTROLS.filter((control) =>
  control.id.startsWith("prescription.")
).map((control) => control.id);

function normalizeFieldEncryption(value: unknown) {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<Record<FieldEncryptionId, unknown>>)
      : {};

  return FIELD_ENCRYPTION_CONTROLS.reduce((acc, control) => {
    acc[control.id] = control.mandatory
      ? true
      : candidate[control.id] !== false;
    return acc;
  }, {} as Record<FieldEncryptionId, boolean>);
}

function parsePrivacySettings(value: unknown): DataPrivacySettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_PRIVACY_SETTINGS;
  }

  const candidate = value as Partial<DataPrivacySettings>;
  const fieldEncryption = normalizeFieldEncryption(candidate.fieldEncryption);
  return {
    encryptClinicalPrescriptionData: PRESCRIPTION_FIELD_IDS.some(
      (id) => fieldEncryption[id]
    ),
    fieldEncryption,
  };
}

export async function getDataPrivacySettings(): Promise<DataPrivacySettings> {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: PRIVACY_SETTING_KEY },
  });

  return parsePrivacySettings(setting?.value);
}

export async function updateDataPrivacySettings(
  settings: Pick<DataPrivacySettings, "fieldEncryption">
): Promise<DataPrivacySettings> {
  const fieldEncryption = normalizeFieldEncryption(settings.fieldEncryption);
  const value = {
    encryptClinicalPrescriptionData: PRESCRIPTION_FIELD_IDS.some(
      (id) => fieldEncryption[id]
    ),
    fieldEncryption,
  };

  const setting = await prisma.platformSetting.upsert({
    where: { key: PRIVACY_SETTING_KEY },
    create: {
      key: PRIVACY_SETTING_KEY,
      value,
    },
    update: { value },
  });

  return parsePrivacySettings(setting.value);
}
