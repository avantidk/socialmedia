import { json, sleep } from "../http.ts";
import type { Account, PostInput, PublishResult, SyncResult } from "../types.ts";

const G = "https://graph.facebook.com/v21.0";
const form = (o: Record<string, string>) => new URLSearchParams(o);

async function waitReady(id: string, token: string) {
  for (let i = 0; i < 40; i++) {
    const j = await json(`${G}/${id}?fields=status_code,status&access_token=${token}`);
    if (j.status_code === "FINISHED") return;
    if (j.status_code === "ERROR" || j.status_code === "EXPIRED") throw new Error(`Instagram processing failed: ${j.status ?? j.status_code}`);
    await sleep(3000);
  }
  throw new Error("Instagram took too long to process the media");
}

export async function publishInstagram(a: Account, token: string, p: PostInput): Promise<PublishResult> {
  if (!p.media.length) throw new Error("Instagram needs at least one image or video");
  const ig = a.external_id;
  let creation: string;

  if (p.media.length === 1) {
    const m = p.media[0];
    const body: Record<string, string> = { caption: p.body, access_token: token };
    if (m.type === "video") { body.media_type = "REELS"; body.video_url = m.url; } else body.image_url = m.url;
    creation = (await json(`${G}/${ig}/media`, { method: "POST", body: form(body) })).id;
  } else {
    const children: string[] = [];
    for (const m of p.media.slice(0, 10)) {
      const body: Record<string, string> = { is_carousel_item: "true", access_token: token };
      if (m.type === "video") { body.media_type = "VIDEO"; body.video_url = m.url; } else body.image_url = m.url;
      const id = (await json(`${G}/${ig}/media`, { method: "POST", body: form(body) })).id;
      await waitReady(id, token);
      children.push(id);
    }
    creation = (await json(`${G}/${ig}/media`, {
      method: "POST",
      body: form({ media_type: "CAROUSEL", children: children.join(","), caption: p.body, access_token: token }),
    })).id;
  }
  await waitReady(creation, token);
  const pub = await json(`${G}/${ig}/media_publish`, { method: "POST", body: form({ creation_id: creation, access_token: token }) });
  const info = await json(`${G}/${pub.id}?fields=permalink&access_token=${token}`).catch(() => ({} as any));
  return { id: pub.id, url: info.permalink };
}

export async function syncInstagram(a: Account, token: string): Promise<SyncResult> {
  const acc = await json(`${G}/${a.external_id}?fields=followers_count&access_token=${token}`);
  const media = await json(
    `${G}/${a.external_id}/media?limit=25&fields=caption,timestamp,permalink,like_count,comments_count&access_token=${token}`,
  );
  return {
    followers: acc.followers_count ?? null,
    items: (media.data ?? []).map((x: any) => ({
      external_id: x.id,
      title: (x.caption ?? "").slice(0, 120),
      url: x.permalink,
      published_at: x.timestamp,
      likes: x.like_count ?? 0,
      comments: x.comments_count ?? 0,
    })),
  };
}
