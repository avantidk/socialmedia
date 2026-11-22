import { NextResponse } from "next/server";
import { syncAll } from "@/lib/engine";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { companyId } = await req.json().catch(() => ({}));
  return NextResponse.json({ errors: await syncAll(companyId) });
}
