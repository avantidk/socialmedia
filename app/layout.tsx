import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "Social Hub", description: "Post once, publish everywhere" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <span className="logo">Social Hub</span>
          <Link href="/">Dashboard</Link>
          <Link href="/compose">New post</Link>
          <Link href="/posts">Posts</Link>
          <Link href="/accounts">Accounts</Link>
          <span className="sp" />
          <LogoutButton />
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
