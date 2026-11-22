// Single Supabase Edge Function that is the whole backend. Deployed with --no-verify-jwt:
// every route checks the caller itself (user session, CRON_SECRET, or OAuth state).
import { Buffer } from "node:buffer";
import { db } from "./db.ts";
import { encrypt } from "./crypto.ts";
import { env, siteUrl } from "./env.ts";
import { json } from "./http.ts";
import { PROVIDERS, redirectUri, startOAuth, type Provider } from "./oauth.ts";
import { processDue, syncAll } from "./engine.ts";

declare const Deno: { serve(h: (r: Request) => Response | Promise<Response>): void };
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Run work after the response has been sent (uploads can take minutes).
const background = (p: Promise<unknown>) => {
  const safe = p.catch((e) => console.error("background error", e));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(safe);
};

async function requireUser(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await db().auth.getUser(token);
  return error ? null : data.user;
}
const cronOk = (req: Request) => req.headers.get("authorization") === `Bearer ${Deno_env("CRON_SECRET")}`;
function Deno_env(k: string) { return (globalThis as any).Deno.env.get(k) ?? "\u0000none"; }

const G = "https://graph.facebook.com/v21.0";
async function save(row: Record<string, unknown>) {
  const { error } = await db().from("accounts").upsert(row, { onConflict: "company_id,platform,external_id" });
  if (error) throw new Error(error.message);
}
const exp = (s?: number) => (s ? new Date(Date.now() + s * 1000).toISOString() : null);

async function callback(provider: Provider, url: URL): Promise<Response> {
  const back = (msg: string, ok = false) =>
    Response.redirect(`${siteUrl()}/accounts/?${ok ? "ok" : "error"}=${encodeURIComponent(msg)}`, 302);
  try {
    if (url.searchParams.get("error")) return back(url.searchParams.get("error_description") ?? url.searchParams.get("error")!);
    const state = url.searchParams.get("state") ?? "";
    const { data: st } = await db().from("oauth_states").select("*").eq("state", state).maybeSingle();
    if (!st || Date.now() - new Date(st.created_at).getTime() > 15 * 60_000) return back("Connection link expired, try again");
    await db().from("oauth_states").delete().eq("state", state);
    const company = st.company_id as string, verifier = st.verifier as string;
    const code = url.searchParams.get("code")!;
    const redirect_uri = redirectUri(provider);
    let count = 0;

    if (provider === "meta") {
      const short = await json(`${G}/oauth/access_token?` + new URLSearchParams({ client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"), redirect_uri, code }));
      const long = await json(`${G}/oauth/access_token?` + new URLSearchParams({ grant_type: "fb_exchange_token", client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"), fb_exchange_token: short.access_token }));
      const pages = await json(`${G}/me/accounts?limit=100&fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=${long.access_token}`);
      for (const p of pages.data ?? []) {
        await save({ company_id: company, platform: "facebook", external_id: p.id, display_name: p.name, access_token_enc: await encrypt(p.access_token) });
        count++;
        const ig = p.instagram_business_account;
        if (ig) {
          await save({ company_id: company, platform: "instagram", external_id: ig.id, display_name: ig.name ?? ig.username, username: ig.username, access_token_enc: await encrypt(p.access_token) });
          count++;
        }
      }
      if (!count) return back("No Facebook Pages found on that login. Tick the Page(s) in the permission dialog.");
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
        access_token_enc: await encrypt(tok.access_token), refresh_token_enc: tok.refresh_token ? await encrypt(tok.refresh_token) : null, expires_at: exp(tok.expires_in),
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
        access_token_enc: await encrypt(tok.access_token), refresh_token_enc: tok.refresh_token ? await encrypt(tok.refresh_token) : null, expires_at: exp(tok.expires_in),
      });
      count = 1;
    }
    return back(`Connected ${count} account${count === 1 ? "" : "s"}`, true);
  } catch (e) {
    return back((e as Error)?.message ?? "Connection failed");
  }
}

async function createPost(b: any) {
  const { companyId, body = "", title = null, media = [], accountIds = [], scheduledAt = null } = b;
  if (!companyId || !accountIds.length) return reply({ error: "Pick a company and at least one account" }, 400);
  if (!String(body).trim() && !media.length) return reply({ error: "Write something or attach media" }, 400);
  const when = scheduledAt ? new Date(scheduledAt) : new Date();
  if (isNaN(when.getTime())) return reply({ error: "Invalid schedule time" }, 400);
  const immediate = !scheduledAt || when.getTime() <= Date.now() + 5000;

  const { data: accs } = await db().from("accounts").select("id,platform,company_id").in("id", accountIds);
  if (!accs || accs.length !== accountIds.length || accs.some((a: any) => a.company_id !== companyId)) return reply({ error: "Invalid account selection" }, 400);
  const hasVideo = media.some((m: any) => m.type === "video");
  const errs = new Set<string>();
  for (const a of accs as any[]) {
    if (a.platform === "instagram" && !media.length) errs.add("Instagram needs an image or video");
    if (a.platform === "youtube" && !hasVideo) errs.add("YouTube needs a video");
    if (a.platform === "x" && String(body).length > 280) errs.add("X text is limited to 280 characters");
  }
  if (errs.size) return reply({ error: [...errs].join(". ") }, 400);

  const { data: post, error } = await db().from("posts")
    .insert({ company_id: companyId, body, title, media, scheduled_at: (immediate ? new Date() : when).toISOString() })
    .select("id").single();
  if (error || !post) return reply({ error: error?.message ?? "Could not save" }, 500);
  const { error: te } = await db().from("post_targets").insert(accountIds.map((id: string) => ({ post_id: post.id, account_id: id })));
  if (te) return reply({ error: te.message }, 500);
  if (immediate) background(processDue({ postId: post.id }));
  return reply({ id: post.id, immediate });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/api(?=\/|$)/, "") || "/";

  try {
    // Browser redirect from Meta/Google/X: no auth header, protected by the one-time `state`.
    const cb = path.match(/^\/callback\/(meta|youtube|x)$/);
    if (cb) return await callback(cb[1] as Provider, url);

    // Called by Supabase pg_cron.
    if (path === "/cron/publish" || path === "/cron/sync") {
      if (!cronOk(req)) return reply({ error: "Unauthorized" }, 401);
      return reply(path === "/cron/publish" ? { processed: await processDue() } : { errors: await syncAll() });
    }

    const user = await requireUser(req);
    if (!user) return reply({ error: "Please log in again" }, 401);
    const b = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    if (path === "/connect" && req.method === "POST") {
      if (!PROVIDERS.includes(b.provider) || !b.companyId) return reply({ error: "Bad request" }, 400);
      const { url: authUrl, state, verifier } = startOAuth(b.provider);
      await db().from("oauth_states").delete().lt("created_at", new Date(Date.now() - 3600_000).toISOString());
      await db().from("oauth_states").insert({ state, verifier, company_id: b.companyId });
      return reply({ url: authUrl });
    }
    if (path === "/posts" && req.method === "POST") return await createPost(b);
    const retry = path.match(/^\/posts\/([0-9a-f-]{36})\/retry$/);
    if (retry && req.method === "POST") {
      await db().from("post_targets").update({ status: "queued", error: null }).eq("post_id", retry[1]).eq("status", "failed");
      background(processDue({ postId: retry[1] }));
      return reply({ ok: true });
    }
    if (path === "/sync" && req.method === "POST") return reply({ errors: await syncAll(b.companyId) });
    if (path === "/accounts/delete" && req.method === "POST") {
      await db().from("accounts").delete().eq("id", b.id);
      return reply({ ok: true });
    }
    return reply({ error: "Not found" }, 404);
  } catch (e) {
    return reply({ error: (e as Error)?.message ?? "Server error" }, 500);
  }
});
