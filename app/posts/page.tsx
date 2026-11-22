import { db } from "@/lib/db";
import { pickCompany } from "@/lib/queries";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";
import CompanyTabs from "@/components/CompanyTabs";
import RetryButton from "@/components/RetryButton";

export const dynamic = "force-dynamic";

export default async function Posts({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const { companies, current } = await pickCompany((await searchParams).company);
  const { data } = await db().from("posts")
    .select("id,body,title,media,scheduled_at,post_targets(id,status,error,external_url,accounts(platform,display_name))")
    .eq("company_id", current).order("created_at", { ascending: false }).limit(50);
  const colour = (s: string) => (s === "posted" ? "ok" : s === "failed" ? "bad" : "warn");
  return (
    <>
      <h1>Posts</h1>
      <CompanyTabs companies={companies} current={current} base="/posts" />
      {(data ?? []).map((p: any) => (
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
                <td>{t.external_url && <a href={t.external_url} target="_blank">view</a>} {t.error && <span className="bad">{t.error}</span>}</td>
              </tr>))}
          </tbody></table>
          {p.post_targets.some((t: any) => t.status === "failed") && <RetryButton id={p.id} />}
        </div>
      ))}
      {!data?.length && <p className="muted">No posts yet.</p>}
    </>
  );
}
