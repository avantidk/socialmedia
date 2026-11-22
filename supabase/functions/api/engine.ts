import { db } from "./db.ts";
import { getAccessToken } from "./tokens.ts";
import { publishFacebook, syncFacebook } from "./platforms/facebook.ts";
import { publishInstagram, syncInstagram } from "./platforms/instagram.ts";
import { publishYouTube, syncYouTube } from "./platforms/youtube.ts";
import { publishX, syncX } from "./platforms/x.ts";
import type { Account, PostInput, PublishResult, SyncResult } from "./types.ts";

const COLS = "id,company_id,platform,external_id,display_name,username,access_token_enc,refresh_token_enc,expires_at";

async function publishTo(a: Account, p: PostInput): Promise<PublishResult> {
  const token = await getAccessToken(a);
  switch (a.platform) {
    case "facebook": return publishFacebook(a, token, p);
    case "instagram": return publishInstagram(a, token, p);
    case "youtube": return publishYouTube(a, token, p);
    case "x": return publishX(a, token, p);
  }
}

/** Publishes every queued target whose post is due. Safe to call concurrently: targets are claimed atomically. */
export async function processDue(opts: { postId?: string } = {}) {
  const now = new Date().toISOString();
  // A function killed mid-upload leaves rows in "posting"; fail them after 15 min so they can be retried.
  await db().from("post_targets").update({ status: "failed", error: "Timed out while posting. Press Retry." })
    .eq("status", "posting").lt("claimed_at", new Date(Date.now() - 15 * 60_000).toISOString());
  let q = db().from("post_targets")
    .select("id, post_id, posts!inner(body,title,media,scheduled_at)")
    .eq("status", "queued").lte("posts.scheduled_at", now).limit(50);
  if (opts.postId) q = q.eq("post_id", opts.postId);
  const { data: due, error } = await q;
  if (error) throw error;

  let done = 0;
  for (const t of (due ?? []) as any[]) {
    // Claim it: only one worker flips queued -> posting.
    const { data: claimed } = await db().from("post_targets")
      .update({ status: "posting", claimed_at: new Date().toISOString() }).eq("id", t.id).eq("status", "queued").select("id, account_id, attempts");
    if (!claimed?.length) continue;
    const row: any = claimed[0];
    try {
      const { data: acc, error: ae } = await db().from("accounts").select(COLS).eq("id", row.account_id).single();
      if (ae || !acc) throw new Error("Account no longer exists");
      const res = await publishTo(acc as unknown as Account, t.posts);
      await db().from("post_targets").update({
        status: "posted", external_id: res.id, external_url: res.url ?? null,
        error: null, attempts: row.attempts + 1, posted_at: new Date().toISOString(),
      }).eq("id", t.id);
    } catch (e: any) {
      await db().from("post_targets").update({
        status: "failed", error: String(e?.message ?? e).slice(0, 600), attempts: row.attempts + 1,
      }).eq("id", t.id);
    }
    done++;
  }
  return done;
}

async function syncOne(a: Account): Promise<SyncResult> {
  if (a.platform === "x") return syncX();
  const token = await getAccessToken(a);
  if (a.platform === "facebook") return syncFacebook(a, token);
  if (a.platform === "instagram") return syncInstagram(a, token);
  return syncYouTube(a, token);
}

export async function syncAll(companyId?: string) {
  let q = db().from("accounts").select(COLS);
  if (companyId) q = q.eq("company_id", companyId);
  const { data: accounts } = await q;
  const errors: string[] = [];
  for (const a of (accounts ?? []) as unknown as Account[]) {
    try {
      const r = await syncOne(a);
      if (r.followers != null) {
        await db().from("account_stats").upsert(
          { account_id: a.id, day: new Date().toISOString().slice(0, 10), followers: r.followers },
          { onConflict: "account_id,day" });
      }
      if (r.items.length) {
        await db().from("items").upsert(
          r.items.map((i) => ({ ...i, account_id: a.id, synced_at: new Date().toISOString() })),
          { onConflict: "account_id,external_id" });
      }
    } catch (e: any) {
      errors.push(`${a.platform}/${a.display_name ?? a.external_id}: ${e?.message ?? e}`);
    }
  }
  return errors;
}
