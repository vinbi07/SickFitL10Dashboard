import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SickFit Meeting Dashboard",
  description: "Realtime team command center for SickFit L10 meetings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} h-full antialiased`}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){
              var key = "sickfit-theme";
              var root = document.documentElement;
              var stored = null;
              try { stored = localStorage.getItem(key); } catch (_) {}
              var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              var theme = stored === "light" || stored === "dark" ? stored : (prefersDark ? "dark" : "light");
              root.classList.remove("theme-light", "theme-dark");
              root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
              root.style.colorScheme = theme;
            })();`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
