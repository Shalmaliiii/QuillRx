import { NextResponse } from "next/server";

function configuredAllowedIps() {
  return (process.env.ADMIN_CONSOLE_ALLOWED_IPS ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

function normalizeIp(ip: string) {
  if (ip === "::1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) return ip.slice("::ffff:".length);
  return ip;
}

function ipv4ToNumber(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }

  return parts.reduce((acc, part) => (acc << 8) + part, 0) >>> 0;
}

function matchesCidr(ip: string, cidr: string) {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const ipNum = ipv4ToNumber(ip);
  const baseNum = ipv4ToNumber(base);

  if (ipNum == null || baseNum == null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    return false;
  }

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipNum & mask) === (baseNum & mask);
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  const requestIp = (request as Request & { ip?: string }).ip?.trim();

  return normalizeIp(
    cloudflareIp ||
      forwarded ||
      realIp ||
      requestIp ||
      (process.env.NODE_ENV !== "production" ? "127.0.0.1" : "")
  );
}

export function isConsoleIpAllowed(request: Request) {
  const allowedIps = configuredAllowedIps();
  if (allowedIps.length === 0) return process.env.NODE_ENV !== "production";

  const clientIp = getClientIp(request);
  if (!clientIp) return false;

  return allowedIps.some((allowedIp) => {
    if (allowedIp === "*") return true;
    const normalizedAllowed = normalizeIp(allowedIp);
    if (normalizedAllowed.includes("/")) return matchesCidr(clientIp, normalizedAllowed);
    return clientIp === normalizedAllowed;
  });
}

export function verifyConsoleRequest(request: Request) {
  if (!isConsoleIpAllowed(request)) {
    return false;
  }

  const configuredToken =
    process.env.ADMIN_CONSOLE_TOKEN?.trim() ||
    process.env.FOUNDER_DASHBOARD_TOKEN?.trim();
  if (!configuredToken) {
    return false;
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  const headerToken =
    request.headers.get("x-admin-console-token") ??
    request.headers.get("x-founder-token") ??
    "";

  return bearer === configuredToken || headerToken === configuredToken;
}

export function consoleUnauthorizedResponse() {
  return NextResponse.json({ error: "Console access required" }, { status: 401 });
}

export function consoleForbiddenResponse() {
  return NextResponse.json({ error: "IP address is not allowed" }, { status: 403 });
}
