import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveFile } from "@/lib/upload";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
      select: { id: true },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const reports = await prisma.labReport.findMany({
      where: { queueEntryId: entryId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Public lab reports list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
      select: {
        id: true,
        doctorId: true,
        patientId: true,
        name: true,
        phone: true,
        status: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (entry.status === "DONE" || entry.status === "NO_SHOW" || entry.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This visit is already closed" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only PDF, PNG, JPEG, and WebP lab reports are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const fileUrl = await saveFile(file, "lab-report");
    const report = await prisma.labReport.create({
      data: {
        doctorId: entry.doctorId,
        patientId: entry.patientId,
        queueEntryId: entry.id,
        title: title || file.name || "Lab report",
        notes: notes || null,
        fileUrl,
        fileName: file.name || "lab-report",
        fileType: file.type,
        fileSize: file.size,
        submittedByName: entry.name,
        submittedByPhone: entry.phone,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Public lab report upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
