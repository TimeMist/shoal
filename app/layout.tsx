import type { Metadata } from "next";
import { Funnel_Display, Funnel_Sans } from "next/font/google";
import { Suspense } from "react";
import RouteDemoBar, { DemoBar } from "./DemoBar";
import "./globals.css";

const display = Funnel_Display({ variable: "--font-funnel-display", subsets: ["latin"] });
const sans = Funnel_Sans({ variable: "--font-funnel-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shoal",
  description: "Buying power for independent shops, settled with PayPal",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<DemoBar role={null} />}>
          <RouteDemoBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
