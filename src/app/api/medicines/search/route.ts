import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import {
  buildSearchText,
  medicineDisplayName,
  type MedicineCatalogEntry,
} from "@/lib/medicine-catalog";
import { searchRxNorm } from "@/lib/rxnorm";

const LOCAL_LIMIT = 12;
const RXNORM_LIMIT = 8;

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

    const merged = local.map((row) => ({
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
        merged.map((m) => m.genericName.toLowerCase())
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

        const cached = await prisma.medicineCatalog.create({
          data: {
            genericName: entry.genericName,
            rxCui: entry.rxCui,
            source: "rxnorm",
            searchText: buildSearchText(entry),
          },
        });

        merged.push({
          id: cached.id,
          genericName: cached.genericName,
          brandName: cached.brandName,
          strength: cached.strength,
          form: cached.form,
          rxCui: cached.rxCui,
          source: cached.source,
          isEssential: cached.isEssential,
          displayName: medicineDisplayName(cached),
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
