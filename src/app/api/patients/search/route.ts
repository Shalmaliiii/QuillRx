import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const patients = await prisma.patient.findMany({
      where: {
        doctorId,
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(patients);
  } catch (error) {
    console.error("Patient search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
