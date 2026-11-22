import "./globals.css";
import type { ReactNode } from "react";
import App from "@/components/App";

export const metadata = { title: "Social Hub", description: "Post once, publish everywhere" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><App>{children}</App></body>
    </html>
  );
}
