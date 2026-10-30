import "./globals.css";

import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { BrainCircuit } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Quizly",
  description: "A calm, personalized space to practice what you're learning."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="relative flex min-h-screen flex-col">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

            <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-lg">
              <div className="container flex h-14 items-center justify-between">
                <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <BrainCircuit className="size-4" />
                  </span>
                  <span>quizly<span className="text-primary">.</span></span>
                </a>
                <div className="flex items-center gap-3">
                  <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                    <span className="size-1.5 rounded-full bg-brand" />
                    A little progress, every day
                  </span>
                  <ThemeToggle />
                </div>
              </div>
            </header>

            <main className="container flex-1 py-10 sm:py-14">{children}</main>

            <footer className="border-t border-border/60">
              <div className="container flex h-14 items-center justify-center text-xs text-muted-foreground">
                Quizly <span className="px-1.5">·</span> Make space for what you want to know.
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
