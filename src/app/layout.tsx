import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hpri-summer-fellows.example.org"),
  title: {
    default: "HPRI Summer Fellowship Program | Summer 2026",
    template: "%s | HPRI Summer Fellowship Program",
  },
  description:
    "The HPRI Summer Fellowship Program is a six-week hybrid learning experience in homelessness research, housing policy, public health, and community engagement. Summer 2026: June 22–July 30.",
  keywords: [
    "HPRI",
    "Summer Fellows",
    "homelessness research",
    "housing policy",
    "USC",
    "public health",
    "social work",
  ],
  openGraph: {
    title: "HPRI Summer Fellowship Program | Summer 2026",
    description:
      "A central hub for fellows, families, mentors, and staff. June 22–July 30, 2026.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
