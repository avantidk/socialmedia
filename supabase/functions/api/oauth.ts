import { Buffer } from "node:buffer";
import { createHash, randomBytes } from "node:crypto";
import { env, functionUrl } from "./env.ts";

export type Provider = "meta" | "youtube" | "x";
export const PROVIDERS: Provider[] = ["meta", "youtube", "x"];
export const redirectUri = (p: Provider) => `${functionUrl()}/callback/${p}`;

const b64url = (b: Buffer) => b.toString("base64url");

export function startOAuth(p: Provider) {
  const state = b64url(randomBytes(16));
  const verifier = b64url(randomBytes(32));
  let url: string;
  if (p === "meta") {
    const q = new URLSearchParams({
      client_id: env("META_APP_ID"), redirect_uri: redirectUri(p), state, response_type: "code",
      scope: "pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,instagram_basic,instagram_content_publish,instagram_manage_insights,business_management",
    });
    url = `https://www.facebook.com/v21.0/dialog/oauth?${q}`;
  } else if (p === "youtube") {
    const q = new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"), redirect_uri: redirectUri(p), state, response_type: "code",
      scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
      access_type: "offline", prompt: "consent select_account",
    });
    url = `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  } else {
    const q = new URLSearchParams({
      response_type: "code", client_id: env("X_CLIENT_ID"), redirect_uri: redirectUri(p), state,
      scope: "tweet.read tweet.write users.read offline.access",
      code_challenge: b64url(createHash("sha256").update(verifier).digest()), code_challenge_method: "S256",
    });
    url = `https://x.com/i/oauth2/authorize?${q}`;
  }
  return { url, state, verifier };
}
