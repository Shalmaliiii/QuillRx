import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthDoctorId } from "@/lib/auth";
import { prescriptionTemplateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase();

    const templates = await prisma.prescriptionTemplate.findMany({
      where: { doctorId },
      orderBy: { name: "asc" },
    });

    if (!q) {
      return NextResponse.json(templates);
    }

    const filtered = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.diagnosis?.toLowerCase().includes(q)
    );

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Templates list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const doctorId = await getAuthDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = prescriptionTemplateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const template = await prisma.prescriptionTemplate.create({
      data: {
        ...validated.data,
        doctorId,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Template create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
