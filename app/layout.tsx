import type { Metadata } from "next";
import { Cinzel, EB_Garamond, DM_Mono } from "next/font/google";
import { TopBar } from "@/components/TopBar";
import { AppFooter } from "@/components/AppFooter";
import { SessionBridge } from "@/components/SessionBridge";
import { Tour } from "@/components/Tour";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-cinzel" });
const garamond = EB_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-garamond" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
  title: "Charon: read freely, pay honestly",
  description:
    "A reading app for webnovels and manga. No subscriptions and no coins. You pay only for the chapters you read, and a fair, tiny payment reaches the creator automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${cinzel.variable} ${garamond.variable} ${dmMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <SessionBridge />
        <TopBar />
        <main className="min-h-[calc(100vh-4.5rem)]">{children}</main>
        <AppFooter />
        <Tour />
      </body>
    </html>
  );
}
