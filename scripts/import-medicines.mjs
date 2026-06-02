// Import medicines from a JSON or CSV file you downloaded.
//
// Usage:
//   npm run db:import-medicines data/imports/your-file.json
//   npm run db:import-medicines data/imports/your-file.csv
//
// See data/README.md for supported formats and download links.

import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import {
  loadMedicineFile,
  normalizeMedicineRow,
  upsertMedicine,
} from "./medicine-utils.mjs";

dotenvExpand.expand(dotenv.config());

const prisma = new PrismaClient();
const fileArg = process.argv[2];

async function main() {
  if (!fileArg) {
    console.error("Usage: npm run db:import-medicines <path-to-json-or-csv>");
    process.exit(1);
  }

  const abs = path.resolve(fileArg);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }

  const rows = loadMedicineFile(abs);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  console.log(`Importing ${rows.length} rows from ${abs}...`);

  for (const row of rows) {
    const entry = normalizeMedicineRow({ ...row, source: row.source ?? "import" });
    if (!entry) {
      skipped++;
      continue;
    }
    const result = await upsertMedicine(prisma, entry);
    if (result === "created") created++;
    else updated++;
  }

  const total = await prisma.medicineCatalog.count();
  console.log(`${created} created, ${updated} updated, ${skipped} skipped.`);
  console.log(`MedicineCatalog now has ${total} entries.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
