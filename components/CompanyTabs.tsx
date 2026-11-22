import Link from "next/link";

export default function CompanyTabs({ companies, current, base }: { companies: { id: string; name: string }[]; current: string; base: string }) {
  return (
    <div className="tabs">
      {companies.map((c) => (
        <Link key={c.id} href={`${base}?company=${c.id}`} className={c.id === current ? "on" : ""}>{c.name}</Link>
      ))}
    </div>
  );
}
