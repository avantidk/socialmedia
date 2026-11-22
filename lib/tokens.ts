import { db } from "./db";
import { decrypt, encrypt } from "./crypto";
import { env } from "./env";
import { json } from "./http";
import type { Account } from "./types";

// Facebook/Instagram page tokens don't expire. Google and X tokens last ~1-2h and are refreshed here.
export async function getAccessToken(a: Account): Promise<string> {
  if (!a.access_token_enc) throw new Error("Account has no token; reconnect it");
  const stillValid = !a.expires_at || new Date(a.expires_at).getTime() - Date.now() > 120_000;
  if (stillValid) return decrypt(a.access_token_enc);
  if (!a.refresh_token_enc) throw new Error("Token expired and no refresh token; reconnect the account");
  const refresh = decrypt(a.refresh_token_enc);

  let tok: any;
  if (a.platform === "youtube") {
    tok = await json("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"),
        grant_type: "refresh_token", refresh_token: refresh,
      }),
    });
  } else if (a.platform === "x") {
    const basic = Buffer.from(`${env("X_CLIENT_ID")}:${env("X_CLIENT_SECRET")}`).toString("base64");
    tok = await json("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh, client_id: env("X_CLIENT_ID") }),
    });
  } else throw new Error("Token expired; reconnect the account");

  const patch: Record<string, string> = {
    access_token_enc: encrypt(tok.access_token),
    expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
  };
  // X rotates refresh tokens on every use, so the new one must be saved.
  if (tok.refresh_token) patch.refresh_token_enc = encrypt(tok.refresh_token);
  await db().from("accounts").update(patch).eq("id", a.id);
  return tok.access_token;
}
