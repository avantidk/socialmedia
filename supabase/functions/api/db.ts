import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { env } from "./env.ts";

let client: SupabaseClient<any, "public", any> | null = null;
export function db() {
  if (!client) client = createClient<any>(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  return client;
}
