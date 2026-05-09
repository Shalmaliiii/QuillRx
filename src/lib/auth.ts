import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const COOKIE_KEY = "quillrx_session";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

type TokenPayload = { doctorId: string; email: string };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getCurrentDoctor() {
  const token = (await cookies()).get(COOKIE_KEY)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return prisma.doctor.findUnique({ where: { id: payload.doctorId } });
}

export async function requireDoctor() {
  const doctor = await getCurrentDoctor();
  if (!doctor) redirect("/login");
  return doctor;
}

export const sessionCookieName = COOKIE_KEY;
