import { json } from "../http";
import type { Account, PostInput, PublishResult, SyncResult } from "../types";

export async function publishYouTube(_a: Account, token: string, p: PostInput): Promise<PublishResult> {
  const video = p.media.find((m) => m.type === "video");
  if (!video) throw new Error("YouTube needs a video");

  const src = await fetch(video.url);
  if (!src.ok) throw new Error(`Could not read the uploaded video (HTTP ${src.status})`);
  const bytes = Buffer.from(await src.arrayBuffer());
  const title = (p.title || p.body.split("\n")[0] || "Untitled").slice(0, 100);

  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": video.mime || "video/*",
      "X-Upload-Content-Length": String(bytes.length),
    },
    body: JSON.stringify({
      snippet: { title, description: p.body },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    }),
  });
  if (!start.ok) throw new Error(`YouTube refused the upload: ${(await start.text()).slice(0, 300)}`);
  const location = start.headers.get("location");
  if (!location) throw new Error("YouTube did not return an upload URL");

  const up = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": video.mime || "video/*", "Content-Length": String(bytes.length) },
    body: bytes,
  });
  const j: any = await up.json().catch(() => ({}));
  if (!up.ok) throw new Error(`YouTube upload failed: ${JSON.stringify(j).slice(0, 300)}`);
  return { id: j.id, url: `https://www.youtube.com/watch?v=${j.id}` };
}

export async function syncYouTube(_a: Account, token: string): Promise<SyncResult> {
  const h = { Authorization: `Bearer ${token}` };
  const ch = await json("https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&mine=true", { headers: h });
  const c = ch.items?.[0];
  if (!c) return { followers: null, items: [] };
  const uploads = c.contentDetails?.relatedPlaylists?.uploads;
  let items: SyncResult["items"] = [];
  if (uploads) {
    const pl = await json(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=25&playlistId=${uploads}`, { headers: h });
    const ids = (pl.items ?? []).map((i: any) => i.contentDetails.videoId).join(",");
    if (ids) {
      const v = await json(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}`, { headers: h });
      items = (v.items ?? []).map((x: any) => ({
        external_id: x.id,
        title: x.snippet.title,
        url: `https://www.youtube.com/watch?v=${x.id}`,
        published_at: x.snippet.publishedAt,
        likes: Number(x.statistics.likeCount ?? 0),
        comments: Number(x.statistics.commentCount ?? 0),
        views: Number(x.statistics.viewCount ?? 0),
      }));
    }
  }
  return { followers: c.statistics?.hiddenSubscriberCount ? null : Number(c.statistics?.subscriberCount ?? 0), items };
}
