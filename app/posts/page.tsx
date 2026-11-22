"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/App";
import { api, supabase } from "@/lib/supabase";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";

const colour = (s: string) => (s === "posted" ? "ok" : s === "failed" ? "bad" : "warn");

export default function Posts() {
  const { company } = useApp();
  const [posts, setPosts] = useState<any[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    supabase.from("posts")
      .select("id,body,title,media,scheduled_at,post_targets(id,status,error,external_url,accounts(platform,display_name))")
      .eq("company_id", company).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setPosts(data ?? []));
  }, [company, tick]);
  // Keep status fresh while something is still posting.
  useEffect(() => {
    const busy = posts.some((p) => p.post_targets.some((t: any) => t.status === "queued" || t.status === "posting"));
    if (!busy) return;
    const t = setTimeout(() => setTick((x) => x + 1), 5000);
    return () => clearTimeout(t);
  }, [posts]);

  return (
    <>
      <h1>Posts</h1>
      {posts.map((p) => (
        <div className="card" key={p.id} style={{ marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>{(p.title || p.body || "(media only)").slice(0, 90)}</strong>
            <span className="muted">{new Date(p.scheduled_at).toLocaleString("en-IN")} · {p.media.length} file(s)</span>
          </div>
          <table><tbody>
            {p.post_targets.map((t: any) => (
              <tr key={t.id}>
                <td>{PLATFORM_LABEL[t.accounts.platform as Platform]} · {t.accounts.display_name}</td>
                <td className={colour(t.status)}>{t.status}</td>
                <td>{t.external_url && <a href={t.external_url} target="_blank" rel="noreferrer">view</a>} {t.error && <span className="bad">{t.error}</span>}</td>
              </tr>))}
          </tbody></table>
          {p.post_targets.some((t: any) => t.status === "failed") && (
            <p><button className="ghost" onClick={async () => { await api(`/posts/${p.id}/retry`); setTimeout(() => setTick((x) => x + 1), 1500); }}>Retry failed</button></p>
          )}
        </div>
      ))}
      {!posts.length && <p className="muted">No posts yet.</p>}
    </>
  );
}
