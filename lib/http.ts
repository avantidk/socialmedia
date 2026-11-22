export async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const text = await r.text();
  let j: any = {};
  try { j = text ? JSON.parse(text) : {}; } catch { j = { raw: text }; }
  if (!r.ok || j.error) {
    const msg = j.error?.message ?? j.error_description ?? j.detail ?? j.title ?? (typeof j.error === "string" ? j.error : null) ?? j.raw ?? `HTTP ${r.status}`;
    throw new Error(String(msg).slice(0, 500));
  }
  return j;
}
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
