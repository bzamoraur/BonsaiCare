import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
// The "craft pass" display face — a warm, organic serif for page titles and tree
// names (via --font-heading in globals.css). Self-hosted by next/font at build.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

// Runs before first paint so the correct theme (and browser-UI theme-color) is
// applied with no flash. Mirrors src/lib/theme.ts (class + THEME_COLORS); kept
// inline (and tiny) because it must execute synchronously. It OWNS the single
// theme-color meta — so there is no static one to conflict with an explicit
// light/dark choice that differs from the OS.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((t===null||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}m.setAttribute('content',d?'#1a2a1f':'#5a7d54');}catch(e){}})();`;

export const metadata: Metadata = {
  applicationName: "Bonsai Companion",
  title: {
    default: "Bonsai Companion",
    template: "%s · Bonsai Companion",
  },
  description: "A calm, photo-first companion for tracking and caring for your bonsai collection.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bonsai Companion",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
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
      className={cn("font-sans", geist.variable, fraunces.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
