import { NextResponse } from "next/server";
import { getCurrentDoctor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storeBinary } from "@/lib/storage";

export async function POST(req: Request) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const type = String(form.get("type") || "logo");
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File missing" }, { status: 400 });

  const url = await storeBinary(file, type === "signature" ? "signatures" : "logos");
  await prisma.doctor.update({
    where: { id: doctor.id },
    data: type === "signature" ? { signatureUrl: url } : { clinicLogoUrl: url },
  });

  return NextResponse.json({ ok: true, url });
}
