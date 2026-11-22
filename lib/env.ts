export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}
export const siteUrl = () => env("SITE_URL").replace(/\/$/, "");
