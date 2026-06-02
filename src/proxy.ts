import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSessionCookieOptions,
  refreshTeamSession,
  sessionCookie,
  verifySession,
} from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  const token = request.cookies.get(sessionCookie.name)?.value;
  const session = token ? await verifySession(token) : null;

  if (isPublicPath && session) {
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set(
      sessionCookie.name,
      await refreshTeamSession(session),
      getSessionCookieOptions(),
    );
    return response;
  }

  if (!isPublicPath && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();

  if (session) {
    response.cookies.set(
      sessionCookie.name,
      await refreshTeamSession(session),
      getSessionCookieOptions(),
    );
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/sales-tracker/:path*", "/login"],
};
