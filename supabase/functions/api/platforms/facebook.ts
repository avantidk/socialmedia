import { json } from "../http.ts";
import type { Account, PostInput, PublishResult, SyncResult } from "../types.ts";

const G = "https://graph.facebook.com/v21.0";
const form = (o: Record<string, string>) => new URLSearchParams(o);

export async function publishFacebook(a: Account, token: string, p: PostInput): Promise<PublishResult> {
  const page = a.external_id;
  const video = p.media.find((m) => m.type === "video");
  const images = p.media.filter((m) => m.type === "image");

  if (video) {
    const j = await json(`${G}/${page}/videos`, {
      method: "POST",
      body: form({ file_url: video.url, description: p.body, access_token: token }),
    });
    return { id: j.id, url: `https://www.facebook.com/${j.id}` };
  }
  if (images.length === 1) {
    const j = await json(`${G}/${page}/photos`, {
      method: "POST",
      body: form({ url: images[0].url, caption: p.body, access_token: token }),
    });
    return { id: j.post_id ?? j.id, url: `https://www.facebook.com/${j.post_id ?? j.id}` };
  }
  if (images.length > 1) {
    const ids: string[] = [];
    for (const img of images) {
      const j = await json(`${G}/${page}/photos`, {
        method: "POST",
        body: form({ url: img.url, published: "false", access_token: token }),
      });
      ids.push(j.id);
    }
    const body: Record<string, string> = { message: p.body, access_token: token };
    ids.forEach((id, i) => (body[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })));
    const j = await json(`${G}/${page}/feed`, { method: "POST", body: form(body) });
    return { id: j.id, url: `https://www.facebook.com/${j.id}` };
  }
  const j = await json(`${G}/${page}/feed`, { method: "POST", body: form({ message: p.body, access_token: token }) });
  return { id: j.id, url: `https://www.facebook.com/${j.id}` };
}

export async function syncFacebook(a: Account, token: string): Promise<SyncResult> {
  const page = await json(`${G}/${a.external_id}?fields=followers_count,fan_count&access_token=${token}`);
  const posts = await json(
    `${G}/${a.external_id}/posts?limit=25&fields=message,created_time,permalink_url,likes.summary(true).limit(0),comments.summary(true).limit(0),shares&access_token=${token}`,
  );
  return {
    followers: page.followers_count ?? page.fan_count ?? null,
    items: (posts.data ?? []).map((x: any) => ({
      external_id: x.id,
      title: (x.message ?? "").slice(0, 120),
      url: x.permalink_url,
      published_at: x.created_time,
      likes: x.likes?.summary?.total_count ?? 0,
      comments: x.comments?.summary?.total_count ?? 0,
      shares: x.shares?.count ?? 0,
    })),
  };
}
