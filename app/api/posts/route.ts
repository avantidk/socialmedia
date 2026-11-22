import { NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/db";
import { processDue } from "@/lib/engine";

export const maxDuration = 300;

export async function POST(req: Request) {
  const b = await req.json();
  const { companyId, body = "", title = null, media = [], accountIds = [], scheduledAt = null } = b;
  if (!companyId || !accountIds.length) return NextResponse.json({ error: "Pick a company and at least one account" }, { status: 400 });
  if (!body.trim() && !media.length) return NextResponse.json({ error: "Write something or attach media" }, { status: 400 });

  const when = scheduledAt ? new Date(scheduledAt) : new Date();
  if (isNaN(when.getTime())) return NextResponse.json({ error: "Invalid schedule time" }, { status: 400 });
  const immediate = !scheduledAt || when.getTime() <= Date.now() + 5000;

  const { data: accs } = await db().from("accounts").select("id,platform,company_id").in("id", accountIds);
  if (!accs || accs.length !== accountIds.length || accs.some((a: any) => a.company_id !== companyId))
    return NextResponse.json({ error: "Invalid account selection" }, { status: 400 });

  const hasVideo = media.some((m: any) => m.type === "video");
  const errs: string[] = [];
  for (const a of accs as any[]) {
    if (a.platform === "instagram" && !media.length) errs.push("Instagram needs an image or video");
    if (a.platform === "youtube" && !hasVideo) errs.push("YouTube needs a video");
    if (a.platform === "x" && body.length > 280) errs.push("X text is limited to 280 characters");
  }
  if (errs.length) return NextResponse.json({ error: [...new Set(errs)].join(". ") }, { status: 400 });

  const { data: post, error } = await db().from("posts")
    .insert({ company_id: companyId, body, title, media, scheduled_at: (immediate ? new Date() : when).toISOString() })
    .select("id").single();
  if (error || !post) return NextResponse.json({ error: error?.message ?? "Could not save" }, { status: 500 });
  const { error: te } = await db().from("post_targets").insert(accountIds.map((id: string) => ({ post_id: post.id, account_id: id })));
  if (te) return NextResponse.json({ error: te.message }, { status: 500 });

  if (immediate) after(() => processDue({ postId: post.id }));
  return NextResponse.json({ id: post.id, immediate });
}
