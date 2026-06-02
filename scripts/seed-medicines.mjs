// Seeds the medicine catalog from data/medicines-india.json and enriches
// common generics via the free RxNorm API (no key required).
//
// Usage:
//   npm run db:seed-medicines

import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import {
  dataPath,
  normalizeMedicineRow,
  upsertMedicine,
} from "./medicine-utils.mjs";

dotenvExpand.expand(dotenv.config());

const prisma = new PrismaClient();
const RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST";

async function rxnormLookup(name) {
  try {
    const url = `${RXNORM_BASE}/rxcui.json?name=${encodeURIComponent(name)}&search=2`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const ids = data?.idGroup?.rxnormId;
    if (!ids) return null;
    return Array.isArray(ids) ? ids[0] : ids;
  } catch {
    return null;
  }
}

async function main() {
  const file = dataPath("medicines-india.json");
  if (!fs.existsSync(file)) {
    console.error(`Missing seed file: ${file}`);
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  let created = 0;
  let updated = 0;
  let skipped = 0;

  console.log(`Importing ${rows.length} medicines from medicines-india.json...`);

  for (const row of rows) {
    const entry = normalizeMedicineRow(row);
    if (!entry) {
      skipped++;
      continue;
    }
    const result = await upsertMedicine(prisma, entry);
    if (result === "created") created++;
    else updated++;
  }

  console.log(`Local seed: ${created} created, ${updated} updated, ${skipped} skipped.`);

  const generics = [
    ...new Set(rows.map((r) => r.genericName).filter(Boolean)),
  ].slice(0, 40);

  console.log(`Enriching ${generics.length} generics with RxNorm IDs...`);
  let enriched = 0;

  for (const generic of generics) {
    const rxCui = await rxnormLookup(generic.split("+")[0].trim());
    if (!rxCui) continue;

    const result = await prisma.medicineCatalog.updateMany({
      where: {
        genericName: { contains: generic.split("+")[0].trim() },
        rxCui: null,
      },
      data: { rxCui: String(rxCui) },
    });

    enriched += result.count;
    await new Promise((r) => setTimeout(r, 120));
  }

  const total = await prisma.medicineCatalog.count();
  console.log(`RxNorm enrichment touched ${enriched} rows.`);
  console.log(`Done. MedicineCatalog now has ${total} entries.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
