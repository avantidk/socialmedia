import { Buffer } from "node:buffer";
import { json } from "../http.ts";
import type { Account, PostInput, PublishResult, SyncResult } from "../types.ts";

const API = "https://api.x.com/2";

async function fetchBytes(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not read uploaded media (HTTP ${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}

async function uploadImage(token: string, url: string, mime?: string): Promise<string> {
  const fd = new FormData();
  fd.append("media", new Blob([new Uint8Array(await fetchBytes(url))], { type: mime || "image/jpeg" }), "image");
  fd.append("media_category", "tweet_image");
  const j = await json(`${API}/media/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
  return j.data?.id ?? j.id;
}

async function uploadVideo(token: string, url: string, mime?: string): Promise<string> {
  const bytes = await fetchBytes(url);
  const h = { Authorization: `Bearer ${token}` };
  const init = await json(`${API}/media/upload/initialize`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: mime || "video/mp4", total_bytes: bytes.length, media_category: "tweet_video" }),
  });
  const id = init.data?.id ?? init.id;
  const CHUNK = 4 * 1024 * 1024;
  for (let i = 0, seg = 0; i < bytes.length; i += CHUNK, seg++) {
    const fd = new FormData();
    fd.append("segment_index", String(seg));
    fd.append("media", new Blob([new Uint8Array(bytes.subarray(i, i + CHUNK))]));
    await json(`${API}/media/upload/${id}/append`, { method: "POST", headers: h, body: fd });
  }
  await json(`${API}/media/upload/${id}/finalize`, { method: "POST", headers: h });
  return id;
}

export async function publishX(a: Account, token: string, p: PostInput): Promise<PublishResult> {
  if (p.body.length > 280) throw new Error(`Text is ${p.body.length} characters; X allows 280`);
  const ids: string[] = [];
  const video = p.media.find((m) => m.type === "video");
  if (video) ids.push(await uploadVideo(token, video.url, video.mime));
  else for (const m of p.media.filter((m) => m.type === "image").slice(0, 4)) ids.push(await uploadImage(token, m.url, m.mime));

  const body: any = { text: p.body };
  if (ids.length) body.media = { media_ids: ids };
  const j = await json(`${API}/tweets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { id: j.data.id, url: `https://x.com/${a.username ?? "i"}/status/${j.data.id}` };
}

// The free X API plan does not allow reading analytics, so there is nothing to sync.
export async function syncX(): Promise<SyncResult> {
  return { followers: null, items: [] };
}
