import { NextResponse } from "next/server";
import { COOKIE, sessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await sessionToken(), { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
