// Edge-safe (Web Crypto) so it can be used from middleware too.
export async function sessionToken(): Promise<string> {
  const data = new TextEncoder().encode(`${process.env.ADMIN_PASSWORD}:${process.env.SESSION_SECRET}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const COOKIE = "sm_session";
