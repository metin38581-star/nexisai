import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import SonnerToaster from "@/components/layout/SonnerToaster";
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
  icons: {
    icon: "/favicon.svg",
  },
  title: "NexisAI — Yapay Zeka Reklam Platformu",
  description:
    "İşletmenizi yapay zeka arama motorlarında tavsiye edilen seçenekler arasına taşıyan tam otomatik GEO reklam ve veri platformu.",
  keywords: [
    "yapay zeka reklam",
    "GEO optimizasyon",
    "ChatGPT reklam",
    "işletme görünürlük",
    "NexisAI",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-screen`}
      >
        <AuthProvider>
          {children}
          <SonnerToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
