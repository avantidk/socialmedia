import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabase = createClient(SUPABASE_URL || "http://missing", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing");

/** Calls the backend Edge Function with the logged-in user's session. */
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(`${SUPABASE_URL}/functions/v1/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
    body: JSON.stringify(body ?? {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
  return j as T;
}
