import { addDays, format } from "date-fns";
import type { MedicineData, PrescriptionTemplateData } from "@/types";

export const emptyMedicine: MedicineData = {
  name: "",
  strength: "",
  morning: false,
  afternoon: false,
  night: false,
  beforeFood: false,
  duration: "",
  specialInstructions: "",
};

export type TemplateFormValues = {
  diagnosis: string;
  medicines: MedicineData[];
  labTests: string;
  advice: string;
  followUpDate: string;
};

export function applyTemplateToForm(
  template: PrescriptionTemplateData
): Partial<TemplateFormValues> {
  const medicines =
    template.medicines.length > 0
      ? template.medicines.map((m) => ({ ...m }))
      : [{ ...emptyMedicine }];

  const followUpDate =
    template.followUpDays != null && template.followUpDays > 0
      ? format(addDays(new Date(), template.followUpDays), "yyyy-MM-dd")
      : "";

  return {
    diagnosis: template.diagnosis ?? "",
    medicines,
    labTests: template.labTests ?? "",
    advice: template.advice ?? "",
    followUpDate,
  };
}

export function templateToApiBody(values: {
  name: string;
  diagnosis: string;
  medicines: MedicineData[];
  labTests: string;
  advice: string;
  followUpDays: string;
}) {
  const followUpDays = parseInt(values.followUpDays, 10);
  return {
    name: values.name.trim(),
    diagnosis: values.diagnosis.trim() || undefined,
    medicines: values.medicines.filter((m) => m.name.trim()),
    labTests: values.labTests.trim() || undefined,
    advice: values.advice.trim() || undefined,
    followUpDays: Number.isFinite(followUpDays) && followUpDays > 0 ? followUpDays : undefined,
  };
}
