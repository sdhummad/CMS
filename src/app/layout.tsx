import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gujarati Class Portal",
  description: "Roster, attendance, and classroom management for the Gujarati class.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
