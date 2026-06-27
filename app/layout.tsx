import type { Metadata } from "next";
import { Cinzel, EB_Garamond, DM_Mono } from "next/font/google";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-cinzel" });
const garamond = EB_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-garamond" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
  title: "Charon — read freely, pay fairly",
  description:
    "A nanopayment reading platform where AI agents settle what every chapter was truly worth. Read webnovels and manga; value flows automatically to creators on Arc.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${garamond.variable} ${dmMono.variable}`}>
      <body>
        <TopBar />
        <main className="min-h-[calc(100vh-4.5rem)]">{children}</main>
      </body>
    </html>
  );
}
