import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { processDue } from "@/lib/engine";

export const maxDuration = 300;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db().from("post_targets").update({ status: "queued", error: null }).eq("post_id", id).eq("status", "failed");
  after(() => processDue({ postId: id }));
  return NextResponse.json({ ok: true });
}
