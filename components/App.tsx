"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type Company = { id: string; name: string };
type Ctx = { companies: Company[]; company: string; setCompany: (id: string) => void };
const AppCtx = createContext<Ctx>({ companies: [], company: "", setCompany: () => {} });
export const useApp = () => useContext(AppCtx);

function LoginForm() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setErr(error.message);
  }
  return (
    <form className="card login" onSubmit={go}>
      <h1>Social Hub</h1>
      <label>Email</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
      <label>Password</label>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
      {err && <p className="bad">{err}</p>}
      <p><button type="submit">Log in</button></p>
    </form>
  );
}

export default function App({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompanyState] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSignedIn(!!data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    supabase.from("companies").select("id,name").order("name").then(({ data }) => {
      const list = (data ?? []) as Company[];
      setCompanies(list);
      let saved = "";
      try { saved = localStorage.getItem("company") ?? ""; } catch {}
      setCompanyState(list.find((c) => c.id === saved)?.id ?? list[0]?.id ?? "");
    });
  }, [signedIn]);

  const setCompany = (id: string) => { setCompanyState(id); try { localStorage.setItem("company", id); } catch {} };

  if (!ready) return null;
  if (!signedIn) return <main><LoginForm /></main>;

  return (
    <AppCtx.Provider value={{ companies, company, setCompany }}>
      <nav>
        <span className="logo">Social Hub</span>
        <Link href="/">Dashboard</Link>
        <Link href="/compose/">New post</Link>
        <Link href="/posts/">Posts</Link>
        <Link href="/accounts/">Accounts</Link>
        <span className="sp" />
        <button className="ghost" onClick={() => supabase.auth.signOut()}>Log out</button>
      </nav>
      <main>
        <div className="tabs">
          {companies.map((c) => (
            <a key={c.id} href="#" className={c.id === company ? "on" : ""} onClick={(e) => { e.preventDefault(); setCompany(c.id); }}>{c.name}</a>
          ))}
        </div>
        {company ? children : <p className="muted">Loading…</p>}
      </main>
    </AppCtx.Provider>
  );
}
