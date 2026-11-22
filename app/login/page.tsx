"use client";
import { useState } from "react";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) location.href = "/"; else setErr("Wrong password");
  }
  return (
    <form className="card login" onSubmit={go}>
      <h1>Social Hub</h1>
      <label>Password</label>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      {err && <p className="bad">{err}</p>}
      <p><button type="submit">Log in</button></p>
    </form>
  );
}
