import { db } from "@/lib/db";
import { pickCompany } from "@/lib/queries";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";
import CompanyTabs from "@/components/CompanyTabs";
import RemoveAccount from "@/components/RemoveAccount";

export const dynamic = "force-dynamic";

export default async function Accounts({ searchParams }: { searchParams: Promise<{ company?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { companies, current } = await pickCompany(sp.company);
  const { data } = await db().from("accounts").select("id,platform,display_name,username,expires_at").eq("company_id", current).order("platform");
  const co = `?company=${current}`;
  return (
    <>
      <h1>Accounts</h1>
      <CompanyTabs companies={companies} current={current} base="/accounts" />
      {sp.ok && <div className="msg ok">{sp.ok}</div>}
      {sp.error && <div className="msg bad">{sp.error}</div>}
      <div className="card">
        <div className="row">
          <a className="btn" href={`/api/connect/meta${co}`}>Connect Facebook + Instagram</a>
          <a className="btn" href={`/api/connect/youtube${co}`}>Connect YouTube</a>
          <a className="btn" href={`/api/connect/x${co}`}>Connect X</a>
        </div>
        <p className="muted">Facebook login connects every Page you tick and the Instagram account linked to each. Log in to the right profile for this company before pressing Connect.</p>
      </div>
      <h2>Connected</h2>
      <div className="card"><table>
        <thead><tr><th>Platform</th><th>Name</th><th></th></tr></thead>
        <tbody>
          {(data ?? []).map((a: any) => (
            <tr key={a.id}><td>{PLATFORM_LABEL[a.platform as Platform]}</td><td>{a.display_name}{a.username ? <span className="muted"> @{a.username.replace(/^@/, "")}</span> : null}</td><td><RemoveAccount id={a.id} /></td></tr>
          ))}
          {!data?.length && <tr><td colSpan={3} className="muted">Nothing connected for this company yet.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
