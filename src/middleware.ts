import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isConsoleIpAllowed } from "@/lib/console-auth";

const publicPaths = ["/", "/login", "/register", "/founder", "/console"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/console" && !isConsoleIpAllowed(request)) {
    return new NextResponse("IP address is not allowed", { status: 403 });
  }

  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/uploads/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("quillrx_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
