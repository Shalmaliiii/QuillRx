import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildSearchText(entry) {
  return [entry.genericName, entry.brandName, entry.strength, entry.form]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function normalizeMedicineRow(row) {
  const genericName = String(row.genericName ?? row.generic ?? row.name ?? "").trim();
  if (!genericName) return null;

  return {
    genericName,
    brandName: row.brandName ?? row.brand ?? null,
    strength: row.strength ?? null,
    form: row.form ?? null,
    rxCui: row.rxCui ?? null,
    source: row.source ?? "local",
    isEssential: Boolean(row.isEssential),
    searchText: buildSearchText({
      genericName,
      brandName: row.brandName ?? row.brand ?? null,
      strength: row.strength ?? null,
      form: row.form ?? null,
    }),
  };
}

export async function upsertMedicine(prisma, entry) {
  const existing = await prisma.medicineCatalog.findFirst({
    where: {
      genericName: entry.genericName,
      brandName: entry.brandName ?? null,
      strength: entry.strength ?? null,
      form: entry.form ?? null,
    },
  });

  if (existing) {
    await prisma.medicineCatalog.update({
      where: { id: existing.id },
      data: {
        searchText: entry.searchText,
        isEssential: entry.isEssential || existing.isEssential,
        rxCui: entry.rxCui ?? existing.rxCui,
        source: existing.source === "local" ? existing.source : entry.source,
      },
    });
    return "updated";
  }

  await prisma.medicineCatalog.create({ data: entry });
  return "created";
}

export function loadMedicineFile(filePath) {
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, "utf8");

  if (abs.endsWith(".json")) {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.medicines ?? [];
  }

  if (abs.endsWith(".csv")) {
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    const [headerLine, ...rows] = lines;
    const headers = headerLine.split(",").map((h) => h.trim());
    return rows.map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const row = {};
      headers.forEach((h, i) => {
        row[h] = cols[i] ?? "";
      });
      if (row.isEssential != null) {
        row.isEssential = row.isEssential === "true" || row.isEssential === "1";
      }
      return row;
    });
  }

  throw new Error("Unsupported file type. Use .json or .csv");
}

export function dataPath(...parts) {
  return path.join(__dirname, "..", "data", ...parts);
}
