"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "./BottomNav";

export function Navbar() {
  const pathname = usePathname();
  return (
    <header
      className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0e1a]/90 backdrop-blur-lg"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
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

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                isActive(pathname, item.href) ? "text-[#f4c430] bg-[#f4c430]/10" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/draft"
          className="md:hidden px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#f4c430] to-[#c99a2e] text-black text-xs font-bold active:scale-95 transition"
        >
          Mulai Draft
        </Link>
      </div>
    </header>
  );
}
