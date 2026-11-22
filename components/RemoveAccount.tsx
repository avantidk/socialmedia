"use client";
export default function RemoveAccount({ id }: { id: string }) {
  return <button className="ghost" onClick={async () => { if (confirm("Disconnect this account?")) { await fetch(`/api/accounts/${id}`, { method: "DELETE" }); location.reload(); } }}>Disconnect</button>;
}
