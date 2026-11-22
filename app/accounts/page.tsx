"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/App";
import { api, supabase } from "@/lib/supabase";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";

export default function Accounts() {
  const { company } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("ok")) setFlash({ ok: true, text: q.get("ok")! });
    else if (q.get("error")) setFlash({ ok: false, text: q.get("error")! });
  }, []);
  useEffect(() => {
    supabase.from("accounts").select("id,platform,display_name,username").eq("company_id", company).order("platform").then(({ data }) => setRows(data ?? []));
  }, [company, tick]);

  async function connect(provider: "meta" | "youtube" | "x") {
    try { const { url } = await api<{ url: string }>("/connect", { provider, companyId: company }); location.href = url; }
    catch (e: any) { setFlash({ ok: false, text: e.message }); }
  }
  async function remove(id: string) {
    if (!confirm("Disconnect this account?")) return;
    await api("/accounts/delete", { id }); setTick((t) => t + 1);
  }

  return (
    <>
      <h1>Accounts</h1>
      {flash && <div className={`msg ${flash.ok ? "ok" : "bad"}`}>{flash.text}</div>}
      <div className="card">
        <div className="row">
          <button onClick={() => connect("meta")}>Connect Facebook + Instagram</button>
          <button onClick={() => connect("youtube")}>Connect YouTube</button>
          <button onClick={() => connect("x")}>Connect X</button>
        </div>
        <p className="muted">Facebook login connects every Page you tick and the Instagram account linked to each. Log in to the right profile for this company before pressing Connect.</p>
      </div>
      <h2>Connected</h2>
      <div className="card"><table>
        <thead><tr><th>Platform</th><th>Name</th><th></th></tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>{PLATFORM_LABEL[a.platform as Platform]}</td>
              <td>{a.display_name}{a.username ? <span className="muted"> @{String(a.username).replace(/^@/, "")}</span> : null}</td>
              <td><button className="ghost" onClick={() => remove(a.id)}>Disconnect</button></td>
            </tr>))}
          {!rows.length && <tr><td colSpan={3} className="muted">Nothing connected for this company yet.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
