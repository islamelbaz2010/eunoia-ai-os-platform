import type { Metadata } from "next";
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://eunoiaos.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Eunoia AI OS",
    template: "%s | Eunoia AI OS",
  },
  description:
    "AI Operating System for Hotels, Resorts & Hospitality Groups across Egypt, UAE, and Saudi Arabia.",
  openGraph: {
    title: "Eunoia AI OS",
    description:
      "AI Operating System for Hotels, Resorts & Hospitality Groups.",
    url: APP_URL,
    siteName: "Eunoia AI OS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eunoia AI OS",
    description:
      "AI Operating System for Hotels, Resorts & Hospitality Groups.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
