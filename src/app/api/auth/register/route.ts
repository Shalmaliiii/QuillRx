import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const parsed = registerSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const exists = await prisma.doctor.findUnique({ where: { email: parsed.data.email } });
  if (exists) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  const passwordHash = await hashPassword(parsed.data.password);
  const rest = { ...parsed.data };
  delete (rest as { password?: string }).password;
  await prisma.doctor.create({ data: { ...rest, passwordHash } });
  return NextResponse.json({ ok: true });
}
