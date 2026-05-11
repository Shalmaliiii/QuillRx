import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.doctor.findUnique({
      where: { email: validated.data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(validated.data.password);

    const doctor = await prisma.doctor.create({
      data: {
        ...validated.data,
        password: hashedPassword,
      },
    });

    const token = generateToken(doctor.id);
    const cookie = setAuthCookie(token);

    const response = NextResponse.json(
      {
        id: doctor.id,
        email: doctor.email,
        fullName: doctor.fullName,
      },
      { status: 201 }
    );

    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
