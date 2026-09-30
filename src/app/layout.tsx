import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sygos",
  description: "Monitoreo inteligente y operación SYSTRON / Servomotores",
  applicationName: "Sygos",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/sygos-lockup.png", type: "image/png" }],
    apple: "/brand/sygos-lockup.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d2741",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
