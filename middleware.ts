import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, sessionToken } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Fail closed: without these secrets the session cookie would be guessable.
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    if (pathname.startsWith("/api/cron/")) return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    return new NextResponse("Server not configured: set ADMIN_PASSWORD and SESSION_SECRET.", { status: 503 });
  }
  // Cron endpoints authenticate with CRON_SECRET inside the route itself.
  if (pathname === "/login" || pathname === "/api/login" || pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }
  if (req.cookies.get(COOKIE)?.value === (await sessionToken())) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
