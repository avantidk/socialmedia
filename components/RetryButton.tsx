"use client";
export default function RetryButton({ id }: { id: string }) {
  return <p><button className="ghost" onClick={async () => { await fetch(`/api/posts/${id}/retry`, { method: "POST" }); setTimeout(() => location.reload(), 1500); }}>Retry failed</button></p>;
}
