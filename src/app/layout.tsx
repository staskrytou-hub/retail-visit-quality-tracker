import type { Metadata, Viewport } from "next";
import EnglishInterface from "@/components/EnglishInterface";
import "./globals.css";
import "./wizard-fix.css";

export const metadata: Metadata = {
  title: "Retail Visit Quality Tracker",
  description: "Retail visit quality tracking application",
  manifest: "/manifest.webmanifest",
  applicationName: "Retail Visit Tracker",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Retail Visit Tracker" },
  icons: {
    icon: [
      { url: "/retail-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/retail-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/retail-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { themeColor: "#0b6b43", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><EnglishInterface />{children}</body></html>;
}
