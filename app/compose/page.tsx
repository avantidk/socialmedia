import { db } from "@/lib/db";
import { pickCompany } from "@/lib/queries";
import CompanyTabs from "@/components/CompanyTabs";
import Composer from "@/components/Composer";

export const dynamic = "force-dynamic";

export default async function Compose({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const { companies, current } = await pickCompany((await searchParams).company);
  const { data } = await db().from("accounts").select("id,platform,display_name,username").eq("company_id", current).order("platform");
  return (
    <>
      <h1>New post</h1>
      <CompanyTabs companies={companies} current={current} base="/compose" />
      <Composer key={current} companyId={current} accounts={(data ?? []) as any} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} anonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!} />
    </>
  );
}
