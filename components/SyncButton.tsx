"use client";
import { useState } from "react";

export default function SyncButton({ companyId }: { companyId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <span className="row">
      <button className="ghost" disabled={busy} onClick={async () => {
        setBusy(true); setMsg("");
        const r = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
        const j = await r.json().catch(() => ({}));
        setBusy(false);
        if (j.errors?.length) setMsg(j.errors.join(" | ")); else location.reload();
      }}>{busy ? "Refreshing…" : "Refresh stats"}</button>
      {msg && <span className="bad">{msg}</span>}
    </span>
  );
}
