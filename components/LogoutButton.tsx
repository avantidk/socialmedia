"use client";
export default function LogoutButton() {
  return (
    <button className="ghost" onClick={async () => { await fetch("/api/logout", { method: "POST" }); location.href = "/login"; }}>
      Log out
    </button>
  );
}
