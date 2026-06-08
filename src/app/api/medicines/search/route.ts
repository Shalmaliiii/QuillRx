import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import {
  medicineDisplayName,
  type MedicineCatalogEntry,
} from "@/lib/medicine-catalog";
import { searchRxNorm } from "@/lib/rxnorm";

const LOCAL_LIMIT = 12;
const RXNORM_LIMIT = 8;

type MedicineSearchRow = Required<
  Pick<MedicineCatalogEntry, "id" | "genericName" | "source" | "isEssential">
> &
  Pick<
    MedicineCatalogEntry,
    "brandName" | "strength" | "form" | "rxCui"
  > & {
    displayName: string;
  };

export async function GET(request: Request) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) {
      return NextResponse.json({ results: [] });
    }

    const needle = q.toLowerCase();

    const local = await prisma.medicineCatalog.findMany({
      where: { searchText: { contains: needle } },
      orderBy: [{ isEssential: "desc" }, { genericName: "asc" }],
      take: LOCAL_LIMIT,
    });

    const merged: MedicineSearchRow[] = local.map((row) => ({
      id: row.id,
      genericName: row.genericName,
      brandName: row.brandName,
      strength: row.strength,
      form: row.form,
      rxCui: row.rxCui,
      source: row.source,
      isEssential: row.isEssential,
      displayName: medicineDisplayName(row),
    }));

    if (merged.length < LOCAL_LIMIT) {
      const rxHits = await searchRxNorm(q, RXNORM_LIMIT);
      const existing = new Set(
        merged.map((medicine) => medicine.genericName.toLowerCase())
      );

      for (const hit of rxHits) {
        const key = hit.genericName.toLowerCase();
        if (existing.has(key)) continue;
        existing.add(key);

        const entry: MedicineCatalogEntry = {
          genericName: hit.genericName,
          rxCui: hit.rxCui,
          source: "rxnorm",
        };

        const existingRx = await prisma.medicineCatalog.findFirst({
          where: { genericName: hit.genericName, source: "rxnorm" },
        });

        if (existingRx) {
          merged.push({
            id: existingRx.id,
            genericName: existingRx.genericName,
            brandName: existingRx.brandName,
            strength: existingRx.strength,
            form: existingRx.form,
            rxCui: existingRx.rxCui,
            source: existingRx.source,
            isEssential: existingRx.isEssential,
            displayName: medicineDisplayName(existingRx),
          });
          continue;
        }

        merged.push({
          id: `rxnorm:${entry.rxCui ?? entry.genericName}`,
          genericName: entry.genericName,
          brandName: null,
          strength: null,
          form: null,
          rxCui: entry.rxCui,
          source: "rxnorm",
          isEssential: false,
          displayName: medicineDisplayName(entry),
        });

        if (merged.length >= LOCAL_LIMIT + RXNORM_LIMIT) break;
      }
    }

    return NextResponse.json({ results: merged.slice(0, LOCAL_LIMIT + RXNORM_LIMIT) });
  } catch (error) {
    console.error("Medicine search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
