import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Browser uploads big files straight to Supabase Storage with this one-time URL.
export async function POST(req: Request) {
  const { filename } = await req.json();
  const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safe}`;
  const { data, error } = await db().storage.from("media").createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: pub } = db().storage.from("media").getPublicUrl(path);
  return NextResponse.json({ path, token: data.token, publicUrl: pub.publicUrl });
}
