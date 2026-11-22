import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { env, siteUrl } from "@/lib/env";
import { json } from "@/lib/http";
import { PROVIDERS, redirectUri, type Provider } from "@/lib/oauth";

const G = "https://graph.facebook.com/v21.0";

async function save(row: Record<string, unknown>) {
  const { error } = await db().from("accounts").upsert(row, { onConflict: "company_id,platform,external_id" });
  if (error) throw new Error(error.message);
}
const exp = (s?: number) => (s ? new Date(Date.now() + s * 1000).toISOString() : null);

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const back = (msg: string, ok = false) =>
    NextResponse.redirect(`${siteUrl()}/accounts?${ok ? "ok" : "error"}=${encodeURIComponent(msg)}`);
  try {
    if (!PROVIDERS.includes(provider as Provider)) return back("Unknown provider");
    if (url.searchParams.get("error")) return back(url.searchParams.get("error_description") ?? url.searchParams.get("error")!);
    const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)oauth=([^;]+)/)?.[1];
    if (!cookie) return back("Login session expired, try again");
    const { state, verifier, company } = JSON.parse(decodeURIComponent(cookie));
    if (state !== url.searchParams.get("state")) return back("State mismatch, try again");
    const code = url.searchParams.get("code")!;
    const redirect_uri = redirectUri(provider as Provider);
    let count = 0;

    if (provider === "meta") {
      const short = await json(`${G}/oauth/access_token?` + new URLSearchParams({
        client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"), redirect_uri, code }));
      const long = await json(`${G}/oauth/access_token?` + new URLSearchParams({
        grant_type: "fb_exchange_token", client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"),
        fb_exchange_token: short.access_token }));
      const pages = await json(`${G}/me/accounts?limit=100&fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=${long.access_token}`);
      for (const p of pages.data ?? []) {
        await save({ company_id: company, platform: "facebook", external_id: p.id, display_name: p.name, access_token_enc: encrypt(p.access_token) });
        count++;
        const ig = p.instagram_business_account;
        if (ig) {
          await save({ company_id: company, platform: "instagram", external_id: ig.id, display_name: ig.name ?? ig.username, username: ig.username, access_token_enc: encrypt(p.access_token) });
          count++;
        }
      }
      if (!count) return back("No Facebook Pages found on that login. Make sure you ticked the Page(s) in the permission dialog.");
    } else if (provider === "youtube") {
      const tok = await json("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({ code, client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), redirect_uri, grant_type: "authorization_code" }),
      });
      const ch = await json("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${tok.access_token}` } });
      const c = ch.items?.[0];
      if (!c) return back("That Google account has no YouTube channel.");
      await save({
        company_id: company, platform: "youtube", external_id: c.id, display_name: c.snippet.title, username: c.snippet.customUrl,
        access_token_enc: encrypt(tok.access_token), refresh_token_enc: tok.refresh_token ? encrypt(tok.refresh_token) : null, expires_at: exp(tok.expires_in),
      });
      count = 1;
    } else {
      const basic = Buffer.from(`${env("X_CLIENT_ID")}:${env("X_CLIENT_SECRET")}`).toString("base64");
      const tok = await json("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, grant_type: "authorization_code", client_id: env("X_CLIENT_ID"), redirect_uri, code_verifier: verifier }),
      });
      const me = await json("https://api.x.com/2/users/me", { headers: { Authorization: `Bearer ${tok.access_token}` } });
      await save({
        company_id: company, platform: "x", external_id: me.data.id, display_name: me.data.name, username: me.data.username,
        access_token_enc: encrypt(tok.access_token), refresh_token_enc: tok.refresh_token ? encrypt(tok.refresh_token) : null, expires_at: exp(tok.expires_in),
      });
      count = 1;
    }
    const res = back(`Connected ${count} account${count === 1 ? "" : "s"}`, true);
    res.cookies.delete("oauth");
    return res;
  } catch (e: any) {
    return back(e?.message ?? "Connection failed");
  }
}
