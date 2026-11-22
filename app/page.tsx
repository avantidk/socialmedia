"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/App";
import { api, supabase } from "@/lib/supabase";
import { PLATFORMS, PLATFORM_LABEL, type Platform } from "@/lib/types";

const n = (v: number | null | undefined) => (v ?? 0).toLocaleString("en-IN");

export default function Dashboard() {
  const { company } = useApp();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: accs } = await supabase.from("accounts").select("id,platform,display_name,username").eq("company_id", company);
      setAccounts(accs ?? []);
      const ids = (accs ?? []).map((a: any) => a.id);
      if (!ids.length) { setItems([]); setStats([]); return; }
      const [i, s] = await Promise.all([
        supabase.from("items").select("account_id,title,url,published_at,likes,comments,views,shares").in("account_id", ids).order("published_at", { ascending: false }).limit(500),
        supabase.from("account_stats").select("account_id,day,followers").in("account_id", ids).order("day", { ascending: false }).limit(2000),
      ]);
      setItems(i.data ?? []); setStats(s.data ?? []);
    })();
  }, [company, tick]);

  const platOf = new Map(accounts.map((a) => [a.id, a.platform as Platform]));
  const nameOf = new Map(accounts.map((a) => [a.id, a.display_name as string]));
  const per = PLATFORMS.map((p) => {
    const accs = accounts.filter((a) => a.platform === p);
    const its = items.filter((i) => platOf.get(i.account_id) === p);
    const followers = accs.reduce((s, a) => s + (stats.find((x) => x.account_id === a.id)?.followers ?? 0), 0);
    const sum = (k: string) => its.reduce((s, i) => s + (i[k] ?? 0), 0);
    return { p, connected: accs.length, followers, likes: sum("likes"), comments: sum("comments"), views: sum("views"), shares: sum("shares"), posts: its.length };
  });
  const total = (k: "likes" | "comments" | "views" | "shares" | "followers") => per.reduce((s, x) => s + x[k], 0);

  async function refresh() {
    setBusy(true); setMsg("");
    try {
      const r = await api<{ errors: string[] }>("/sync", { companyId: company });
      if (r.errors?.length) setMsg(r.errors.join(" | "));
      setTick((t) => t + 1);
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <>
      <h1>Dashboard</h1>
      <p className="row">
        <button className="ghost" disabled={busy} onClick={refresh}>{busy ? "Refreshing…" : "Refresh stats"}</button>
        {msg && <span className="bad">{msg}</span>}
        <span className="muted">Covers each account's latest 25 posts/videos; refreshes every 3 hours.</span>
      </p>
      <div className="grid">
        <div className="card stat"><b>{n(total("followers"))}</b><span>Followers / subscribers</span></div>
        <div className="card stat"><b>{n(total("likes"))}</b><span>Likes</span></div>
        <div className="card stat"><b>{n(total("comments"))}</b><span>Comments</span></div>
        <div className="card stat"><b>{n(total("views"))}</b><span>Views (YouTube)</span></div>
        <div className="card stat"><b>{n(total("shares"))}</b><span>Shares (Facebook)</span></div>
      </div>

      <h2>By platform</h2>
      <div className="card"><table>
        <thead><tr><th>Platform</th><th>Accounts</th><th>Followers</th><th>Posts</th><th>Likes</th><th>Comments</th><th>Views</th></tr></thead>
        <tbody>{per.map((x) => {
          const na = <span className="muted">n/a</span>;
          return (
            <tr key={x.p}>
              <td>{PLATFORM_LABEL[x.p]}</td>
              <td>{x.connected || <span className="warn">not connected</span>}</td>
              <td>{x.p === "x" ? na : n(x.followers)}</td>
              <td>{x.p === "x" ? na : n(x.posts)}</td>
              <td>{x.p === "x" ? na : n(x.likes)}</td>
              <td>{x.p === "x" ? na : n(x.comments)}</td>
              <td>{x.p === "youtube" ? n(x.views) : <span className="muted">–</span>}</td>
            </tr>);
        })}</tbody>
      </table>
      <p className="muted" style={{ margin: "10px 0 0" }}>X: the free X API plan doesn't allow reading analytics, so only posting works for X.</p></div>

      <h2>Recent posts</h2>
      <div className="card"><table>
        <thead><tr><th>Platform</th><th>Account</th><th>Post</th><th>Date</th><th>Likes</th><th>Comments</th><th>Views</th></tr></thead>
        <tbody>
          {items.slice(0, 30).map((i, k) => (
            <tr key={k}>
              <td>{PLATFORM_LABEL[platOf.get(i.account_id)!]}</td>
              <td>{nameOf.get(i.account_id)}</td>
              <td>{i.url ? <a href={i.url} target="_blank" rel="noreferrer">{i.title || "(no text)"}</a> : i.title}</td>
              <td>{i.published_at ? new Date(i.published_at).toLocaleDateString("en-IN") : ""}</td>
              <td>{n(i.likes)}</td><td>{n(i.comments)}</td><td>{platOf.get(i.account_id) === "youtube" ? n(i.views) : "–"}</td>
            </tr>))}
          {!items.length && <tr><td colSpan={7} className="muted">No data yet. Connect accounts, then press “Refresh stats”.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
