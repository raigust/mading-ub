import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PapanUB | Info Kampus Brawijaya",
  description: "Pusat informasi beasiswa, organisasi, acara, lomba, dan pengumuman Universitas Brawijaya.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}