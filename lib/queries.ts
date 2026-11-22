import { db } from "./db";

export async function getCompanies() {
  const { data } = await db().from("companies").select("id,name").order("name");
  return (data ?? []) as { id: string; name: string }[];
}
export async function pickCompany(param?: string) {
  const companies = await getCompanies();
  const current = companies.find((c) => c.id === param)?.id ?? companies[0]?.id ?? "";
  return { companies, current };
}
