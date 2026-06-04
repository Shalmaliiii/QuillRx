import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { medicineCatalogCreateSchema } from "@/lib/validators";
import { buildSearchText, medicineDisplayName } from "@/lib/medicine-catalog";

export async function POST(request: Request) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = medicineCatalogCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { genericName, brandName, strength, form } = validated.data;
    const normalized = genericName.trim();
    const needle = normalized.toLowerCase();

    const candidates = await prisma.medicineCatalog.findMany({
      where: { searchText: { contains: needle } },
      take: 24,
    });

    const existing = candidates.find(
      (m) =>
        m.genericName.toLowerCase() === needle &&
        (brandName?.trim()
          ? (m.brandName?.toLowerCase() ?? "") === brandName.trim().toLowerCase()
          : !m.brandName)
    );

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        genericName: existing.genericName,
        brandName: existing.brandName,
        strength: existing.strength ?? strength ?? null,
        form: existing.form,
        rxCui: existing.rxCui,
        source: existing.source,
        isEssential: existing.isEssential,
        displayName: medicineDisplayName(existing),
        created: false,
      });
    }

    const created = await prisma.medicineCatalog.create({
      data: {
        genericName: normalized,
        brandName: brandName?.trim() || undefined,
        strength: strength?.trim() || undefined,
        form: form?.trim() || undefined,
        source: "doctor",
        searchText: buildSearchText({
          genericName: normalized,
          brandName: brandName?.trim(),
          strength: strength?.trim(),
          form: form?.trim(),
        }),
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        genericName: created.genericName,
        brandName: created.brandName,
        strength: created.strength,
        form: created.form,
        rxCui: created.rxCui,
        source: created.source,
        isEssential: created.isEssential,
        displayName: medicineDisplayName(created),
        created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Medicine create error:", error);
    return NextResponse.json({ error: "Failed to add medicine" }, { status: 500 });
  }
}
