"use client";
import Link from "next/link";
import { useHeroPower, useTier } from "@/lib/storage";
import { MLBB_HEROES, getHeroById } from "@/lib/database/heroesData";
import { getInitialDraftConfig } from "@/lib/database/draftRules";
import { HeroAvatar } from "@/components/HeroAvatar";

// Deterministic sparkle layout (no Math.random during render).
const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: 1 + (i % 3),
  delay: (i % 6) * 0.7,
  color: ["#f4c430", "#00bfff", "#a78bfa"][i % 3],
}));

const ACTIONS = [
  { href: "/draft", title: "Mulai Draft", desc: "Ban & pick dengan rekomendasi pintar", icon: "🎮", grad: "from-[#f4c430]/25 to-[#c99a2e]/5" },
  { href: "/hero-power", title: "My Hero Power", desc: "Atur hero andalanmu", icon: "⚡", grad: "from-sky-500/25 to-sky-500/5" },
  { href: "/counter", title: "Smart Counter", desc: "Cari counter hero lawan", icon: "🛡️", grad: "from-emerald-500/25 to-emerald-500/5" },
  { href: "/heroes", title: "Database Hero", desc: "Fase early, mid, late", icon: "📚", grad: "from-violet-500/25 to-violet-500/5" },
];

export default function HomePage() {
  const [heroPower] = useHeroPower();
  const [tier] = useTier();
  const featured = ["ling", "fanny", "lancelot", "kagura", "tigreal", "marcel"]
    .map((id) => getHeroById(id))
    .filter((h): h is NonNullable<typeof h> => !!h);
  const showcase = featured.length ? featured : MLBB_HEROES.slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero banner — mobilelegends.com style */}
      <section className="relative overflow-hidden px-4 pt-8 pb-10 md:rounded-b-[32px]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/30 via-[#0a0e1a] to-amber-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,196,48,0.18),transparent_60%)]" />
        <div className="absolute inset-0 pointer-events-none">
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className="absolute rounded-full opacity-40"
              style={{
                left: `${s.left}%`, top: `${s.top}%`, width: s.size * 2, height: s.size * 2, background: s.color,
                animation: `float ${5 + (i % 4)}s ease-in-out ${s.delay}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative">
          <span className="inline-block text-[11px] font-bold tracking-[0.25em] text-[#f4c430] mb-3">★ LAND OF DAWN</span>
          <h1 className="text-[34px] leading-[1.05] sm:text-5xl font-black tracking-tight" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Menang dari
            <br />
            <span className="bg-gradient-to-r from-[#f4c430] to-[#ffd966] bg-clip-text text-transparent">fase draft.</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-md">
            Prediksi hero untuk di-ban &amp; di-pick, counter lawan, kombo tim, dan analisis early–late game. Langsung di browser HP — tanpa install.
          </p>
          <div className="flex gap-2.5 mt-6">
            <Link href="/draft" className="flex-1 sm:flex-none text-center px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#f4c430] to-[#c99a2e] text-black font-bold shadow-lg shadow-[#f4c430]/20 active:scale-95 transition">
              Mulai Draft
            </Link>
            <Link href="/hero-power" className="flex-1 sm:flex-none text-center px-6 py-3.5 rounded-2xl border border-[#f4c430]/40 text-[#f4c430] font-semibold active:scale-95 transition">
              Hero Power
            </Link>
          </div>

          {/* Showcase strip */}
          <div className="flex -space-x-3 mt-7">
            {showcase.map((h) => (
              <HeroAvatar key={h.id} hero={h} size={48} className="ring-2 ring-[#0a0e1a] rounded-2xl" />
            ))}
            <span className="ml-5 self-center text-xs text-slate-400">{MLBB_HEROES.length} hero di database</span>
          </div>
        </div>
      </section>

      <div className="px-4 space-y-6 mt-2">
        {/* Status */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/draft" className="card p-3.5 active:scale-[0.98] transition">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">Tier</div>
            <div className="font-bold mt-0.5">{tier}</div>
            <div className="text-xs text-slate-400">{getInitialDraftConfig(tier).bansPerTeam} ban / tim</div>
          </Link>
          <Link href="/hero-power" className="card p-3.5 active:scale-[0.98] transition">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">Hero Power</div>
            <div className="font-bold mt-0.5">{heroPower.length} hero</div>
            <div className="flex -space-x-2 mt-1">
              {heroPower.slice(0, 5).map((hp) => {
                const h = getHeroById(hp.heroId);
                return h ? <HeroAvatar key={h.id} hero={h} size={22} className="ring-1 ring-[#1a1f35]" /> : null;
              })}
              {heroPower.length === 0 && <span className="text-xs text-[#f4c430]">+ Tambah</span>}
            </div>
          </Link>
        </div>

        {/* Quick actions */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold mb-2.5">Menu Cepat</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {ACTIONS.map((a) => (
              <Link key={a.href} href={a.href} className={`relative overflow-hidden card p-4 min-h-[120px] flex flex-col justify-between active:scale-[0.98] transition`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${a.grad}`} />
                <span className="relative text-2xl">{a.icon}</span>
                <div className="relative">
                  <div className="font-bold leading-tight">{a.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{a.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="card p-4">
          <h2 className="font-bold mb-3">Cara pakai (3 langkah)</h2>
          <ol className="space-y-3">
            {[
              ["Isi Hero Power", "Ketik nama hero andalan, atur level penguasaan."],
              ["Pilih tier & cek prediksi ban", "Lihat hero wajib di-ban sesuai rank dan Hero Power kamu."],
              ["Ikuti saran pick real-time", "Prediksi hero terbaik untuk di-pick, ancaman lawan, combo, dan win condition."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-[#f4c430]/15 text-[#f4c430] text-sm font-bold grid place-items-center">{i + 1}</span>
                <div>
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-xs text-slate-400">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
