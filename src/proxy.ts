import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionCookie, verifySession } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  const token = request.cookies.get(sessionCookie.name)?.value;
  const session = token ? await verifySession(token) : null;

  if (isPublicPath && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublicPath && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login"],
};
