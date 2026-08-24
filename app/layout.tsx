import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/fontawesome";
import ThemeScript from "@/components/theme/ThemeScript";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Public marketing site only (see app/globals.css) — headings + telemetry-
// style data readouts (dates/km/duur/prijs). Admin keeps plain Inter.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
const description =
  "35events organiseert auto-rondritten en meets. Bekijk aankomende events en media van vorige edities.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "35events — Auto rondritten & meets",
    template: "%s — 35events",
  },
  description,
  openGraph: {
    title: "35events — Auto rondritten & meets",
    description,
    siteName: "35events",
    locale: "nl_BE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "35events — Auto rondritten & meets",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-[#FAFAFA] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
