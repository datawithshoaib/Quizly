import "./globals.css";

import type { ReactNode } from "react";
import { BrainCircuit } from "lucide-react";

export const metadata = {
  title: "Quizly",
  description: "A calm, personalized space to practice what you're learning."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto min-h-screen w-full max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
          <header className="mb-8 flex items-center justify-between sm:mb-10">
            <a href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111b3f] text-emerald-300 shadow-md shadow-slate-900/15">
                <BrainCircuit size={19} />
              </span>
              <span className="text-lg">quizly<span className="text-blue-600">.</span></span>
            </a>
            <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3.5 py-2 text-xs font-medium text-slate-500 shadow-sm sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]" />
              A little progress, every day
            </div>
          </header>
          <main>{children}</main>
          <footer className="mx-auto mt-12 max-w-6xl border-t border-slate-200/80 py-6 text-center text-xs text-slate-400">
            Quizly <span className="px-1.5 text-slate-300">·</span> Make space for what you want to know.
          </footer>
        </div>
      </body>
    </html>
  );
}

