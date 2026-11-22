declare const Deno: { env: { get(k: string): string | undefined } };

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}. Add it in GitHub → Settings → Secrets → Actions and re-run "Deploy backend".`);
  return v;
}
export const siteUrl = () => env("SITE_URL").replace(/\/$/, "");
// Public URL of this function, used as the OAuth redirect base.
export const functionUrl = () => `${env("SUPABASE_URL").replace(/\/$/, "")}/functions/v1/api`;
