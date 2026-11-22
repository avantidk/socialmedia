"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { PLATFORM_LABEL, type Media, type Platform } from "@/lib/types";

type Acc = { id: string; platform: Platform; display_name: string; username: string | null };

export default function Composer({ companyId, accounts, supabaseUrl, anonKey }: { companyId: string; accounts: Acc[]; supabaseUrl: string; anonKey: string }) {
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const selected = accounts.filter((a) => picked.includes(a.id));
  const has = (p: Platform) => selected.some((a) => a.platform === p);
  const toggle = (id: string) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!picked.length) return setMsg({ ok: false, text: "Choose at least one account." });
    setBusy(true);
    try {
      const sb = createClient(supabaseUrl, anonKey);
      const media: Media[] = [];
      for (const f of files) {
        const r = await fetch("/api/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: f.name }) });
        const u = await r.json();
        if (!r.ok) throw new Error(u.error);
        const up = await sb.storage.from("media").uploadToSignedUrl(u.path, u.token, f, { contentType: f.type });
        if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
        media.push({ url: u.publicUrl, path: u.path, mime: f.type, type: f.type.startsWith("video/") ? "video" : "image" });
      }
      const res = await fetch("/api/posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, body, title: title || null, media, accountIds: picked, scheduledAt: when ? new Date(when).toISOString() : null }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg({ ok: true, text: j.immediate ? "Posting started. Check the Posts page for the result of each platform." : "Scheduled! It will go out at the chosen time." });
      setBody(""); setTitle(""); setFiles([]); setWhen(""); setPicked([]);
    } catch (err: any) {
      setMsg({ ok: false, text: err.message ?? "Something went wrong" });
    } finally { setBusy(false); }
  }

  if (!accounts.length) return <div className="card">No accounts connected for this company yet. Go to <a href="/accounts">Accounts</a> first.</div>;

  return (
    <form className="card" onSubmit={submit}>
      <label style={{ marginTop: 0 }}>Post to</label>
      {accounts.map((a) => (
        <label className="chk" key={a.id}>
          <input type="checkbox" checked={picked.includes(a.id)} onChange={() => toggle(a.id)} />
          <strong>{PLATFORM_LABEL[a.platform]}</strong> {a.display_name}
        </label>
      ))}

      <label>Text / caption</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your post…" />
      <div className="muted">{body.length} characters{has("x") && <span className={body.length > 280 ? "bad" : ""}> · X limit 280</span>}</div>

      {has("youtube") && (<><label>YouTube title</label><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Defaults to the first line of the text" /></>)}

      <label>Images / video</label>
      <input type="file" multiple accept="image/*,video/*" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      <div className="muted">
        {has("instagram") && "Instagram needs an image or video (video posts as a Reel). "}
        {has("youtube") && "YouTube needs a video. "}
        Files up to 50 MB on the free Supabase plan.
      </div>

      <label>Schedule (optional, leave empty to post now)</label>
      <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />

      {msg && <p className={msg.ok ? "ok" : "bad"}>{msg.text}</p>}
      <p><button disabled={busy}>{busy ? "Working…" : when ? "Schedule post" : "Post now"}</button></p>
    </form>
  );
}
