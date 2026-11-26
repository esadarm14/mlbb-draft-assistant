"use client";
import Link from "next/link";

export function Navbar() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0e1a]/90 backdrop-blur-lg"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f4c430] to-[#c99a2e] flex items-center justify-center font-black text-black text-xs shadow-lg shadow-[#f4c430]/20">
            ML
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              MLBB
            </div>
            <div className="text-[10px] text-slate-400 tracking-[0.15em]">DRAFT ASSISTANT</div>
          </div>
        </Link>

        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[#f4c430]/30 bg-[#f4c430]/10 text-[#f4c430]">
          Live Ban &amp; Pick
        </span>
      </div>
    </header>
  );
}
