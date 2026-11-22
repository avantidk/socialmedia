import { NextResponse } from "next/server";
import { processDue } from "@/lib/engine";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ processed: await processDue() });
}
