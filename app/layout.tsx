import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import HealthChatbot from "./components/HealthChatbot";
import OfflineSupport from "./components/OfflineSupport";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Mizoram Health Guide",
    default: "Mizoram Health Guide",
  },
  description:
    "Simple, citizen-friendly public health awareness for Mizoram: cancer, tobacco, diabetes, heart health, and mental wellbeing.",
  appleWebApp: { capable: true, title: "Health Guide", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <OfflineSupport />
        <SiteHeader />
        <div id="main-content" className="flex-1 flex flex-col">
          {children}
        </div>
        <SiteFooter />
        <HealthChatbot />
      </body>
    </html>
  );
}
