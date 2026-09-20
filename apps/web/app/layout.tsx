import type { Metadata } from "next";
import "@gendash/react/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenDash",
  description: "Ask a question, get a live dashboard — no SQL, no setup.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
