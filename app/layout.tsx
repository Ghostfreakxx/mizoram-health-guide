import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import WebVitals from "./components/WebVitals";
import SiteHeader, { BottomNav } from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import { SITE } from "./config";
import OfflineSupport from "./components/OfflineSupport";
import { LanguageProvider } from "./i18n/LanguageProvider";
import ChromeGate from "./components/ChromeGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${SITE.name}`,
    default: `${SITE.name} — ${SITE.tagline}`,
  },
  description:
    "Tell us what's wrong, get safe guidance on how urgently to seek care and where to go, talk it through with a virtual doctor, and take a clear summary to a real one.",
  appleWebApp: { capable: true, title: "AI Hospital", statusBarStyle: "default" },
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
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <LanguageProvider>
        <OfflineSupport />
        <ChromeGate>
          <SiteHeader />
        </ChromeGate>
        <div id="main-content" className="flex-1 flex flex-col">
          {children}
        </div>
        <ChromeGate>
          <SiteFooter />
          <BottomNav />
        </ChromeGate>
        <WebVitals />
        </LanguageProvider>
      </body>
    </html>
  );
}
