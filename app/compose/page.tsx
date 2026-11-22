"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/App";
import { api, supabase } from "@/lib/supabase";
import { PLATFORM_LABEL, type Media, type Platform } from "@/lib/types";

type Acc = { id: string; platform: Platform; display_name: string };

export default function Compose() {
  const { company } = useApp();
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setPicked([]);
    supabase.from("accounts").select("id,platform,display_name").eq("company_id", company).order("platform").then(({ data }) => setAccounts((data ?? []) as Acc[]));
  }, [company]);

  const has = (p: Platform) => accounts.some((a) => picked.includes(a.id) && a.platform === p);
  const toggle = (id: string) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!picked.length) return setMsg({ ok: false, text: "Choose at least one account." });
    setBusy(true);
    try {
      const media: Media[] = [];
      for (const f of files) {
        const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const up = await supabase.storage.from("media").upload(path, f, { contentType: f.type });
        if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
        const { data } = supabase.storage.from("media").getPublicUrl(path);
        media.push({ url: data.publicUrl, path, mime: f.type, type: f.type.startsWith("video/") ? "video" : "image" });
      }
      const j = await api<{ immediate: boolean }>("/posts", {
        companyId: company, body, title: title || null, media, accountIds: picked,
        scheduledAt: when ? new Date(when).toISOString() : null,
      });
      setMsg({ ok: true, text: j.immediate ? "Posting started. Open the Posts page to see the result for each platform." : "Scheduled! It will go out at the chosen time." });
      setBody(""); setTitle(""); setFiles([]); setWhen(""); setPicked([]);
    } catch (err: any) {
      setMsg({ ok: false, text: err.message ?? "Something went wrong" });
    } finally { setBusy(false); }
  }

  if (!accounts.length) return (<><h1>New post</h1><div className="card">No accounts connected for this company yet. Go to <a href="/socialmedia/accounts/">Accounts</a> first.</div></>);

  return (
    <>
      <h1>New post</h1>
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
    </>
  );
}
