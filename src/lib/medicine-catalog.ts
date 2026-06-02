/** Shared helpers for the medicine catalog (safe for client + server). */

export interface MedicineCatalogEntry {
  id?: string;
  genericName: string;
  brandName?: string | null;
  strength?: string | null;
  form?: string | null;
  rxCui?: string | null;
  source?: string;
  isEssential?: boolean;
}

export function buildSearchText(entry: {
  genericName: string;
  brandName?: string | null;
  strength?: string | null;
  form?: string | null;
}) {
  return [entry.genericName, entry.brandName, entry.strength, entry.form]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function medicineDisplayName(entry: MedicineCatalogEntry) {
  const parts = [entry.genericName];
  if (entry.strength) parts.push(entry.strength);
  if (entry.brandName) parts.push(`(${entry.brandName})`);
  return parts.join(" ");
}

export function medicinePrescriptionName(entry: MedicineCatalogEntry) {
  if (entry.brandName && !entry.genericName.toLowerCase().includes(entry.brandName.toLowerCase())) {
    return `${entry.genericName} (${entry.brandName})`;
  }
  return entry.genericName;
}
