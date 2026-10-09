import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HCS · Human Capital System",
  description: "Portal klaim dan perjalanan dinas Kantor Wilayah IV Balikpapan",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#064e43",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      {/* Ekstensi browser sering menambah atribut ke <body>; abaikan perbedaan atribut di tag ini saja. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
