import { NextResponse } from "next/server";
import { PROVIDERS, startOAuth, type Provider } from "@/lib/oauth";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const company = new URL(req.url).searchParams.get("company");
  if (!PROVIDERS.includes(provider as Provider) || !company) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { url, state, verifier } = startOAuth(provider as Provider);
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth", JSON.stringify({ state, verifier, company }), { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
