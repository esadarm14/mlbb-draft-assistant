"use client";
import { useMemo, useState } from "react";
import { MLBB_HEROES, getHeroById } from "@/lib/database/heroesData";
import { analyzeEnemyCounters } from "@/lib/engine/recommendationEngine";
import { useHeroPower } from "@/lib/storage";
import { HeroAvatar } from "./HeroAvatar";
import { HeroPicker } from "./HeroPicker";
import { CounterCard, AiNote } from "./AnalysisCards";
import { PhaseRow } from "./PhaseBadge";
import type { CounterBreakdown, Hero, HeroPowerItem, Lane, MasteryLevel, Role } from "@/lib/types";

const LANES: Lane[] = ["EXP Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"];
const MASTERY: MasteryLevel[] = ["Main Hero", "Highly Mastered", "Comfortable", "Backup Hero"];
const ROLES: (Role | "All")[] = ["All", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"];

const masteryColor: Record<MasteryLevel, string> = {
  "Main Hero": "text-[#f4c430] border-[#f4c430]/40 bg-[#f4c430]/10",
  "Highly Mastered": "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
  Comfortable: "text-sky-300 border-sky-400/40 bg-sky-400/10",
  "Backup Hero": "text-slate-300 border-white/20 bg-white/5",
};

const COUNTER_GROUPS: { key: CounterBreakdown["category"]; title: string; hint: string }[] = [
  { key: "Best Counter", title: "🟢 Best Counter", hint: "Matchup paling unggul terhadap hero lawan." },
  { key: "Alternative Counter", title: "🔵 Alternative Counter", hint: "Pilihan kuat bila best counter di-ban / diambil." },
  { key: "Situational Counter", title: "🟡 Situational Counter", hint: "Efektif pada kondisi tertentu." },
];

function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-xl h-[88vh] md:h-auto md:max-h-[85vh] flex flex-col rounded-t-3xl md:rounded-3xl bg-[#101627] border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-black truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-slate-200 hover:bg-white/15 active:scale-95 shrink-0"
          >
            Selesai
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 pb-36"
          style={{ paddingBottom: "calc(8rem + env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function HeroPowerDrawer({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useHeroPower();

  const sorted = useMemo(() => [...items].sort((a, b) => a.priority - b.priority), [items]);
  const byLane = useMemo(() => {
    const map = new Map<Lane, HeroPowerItem[]>();
    for (const lane of LANES) map.set(lane, []);
    for (const it of sorted) map.get(it.primaryLane)?.push(it);
    return map;
  }, [sorted]);

  const add = (ids: string[]) => {
    const id = ids[ids.length - 1];
    const hero = id ? getHeroById(id) : undefined;
    if (!hero || items.some((i) => i.heroId === id)) return;
    setItems((prev) => [
      ...prev,
      {
        heroId: id,
        primaryLane: (hero.lanes[0] ?? "Roam") as Lane,
        masteryLevel: "Comfortable",
        priority: prev.length + 1,
        updatedAt: new Date().toISOString(),
      },
    ]);
  };

  const patch = (id: string, change: Partial<HeroPowerItem>) =>
    setItems((prev) => prev.map((i) => (i.heroId === id ? { ...i, ...change, updatedAt: new Date().toISOString() } : i)));

  const remove = (id: string) =>
    setItems((prev) =>
      prev
        .filter((i) => i.heroId !== id)
        .sort((a, b) => a.priority - b.priority)
        .map((i, idx) => ({ ...i, priority: idx + 1 }))
    );

  const move = (id: string, dir: -1 | 1) => {
    const it = items.find((i) => i.heroId === id);
    if (!it) return;
    const group = byLane.get(it.primaryLane) ?? [];
    const idx = group.findIndex((g) => g.heroId === id);
    const other = group[idx + dir];
    if (!other) return;
    setItems((prev) =>
      prev.map((i) =>
        i.heroId === id ? { ...i, priority: other.priority } : i.heroId === other.heroId ? { ...i, priority: it.priority } : i
      )
    );
  };

  return (
    <Sheet
      title="⚡ Hero Power Kamu"
      subtitle="Hero andalan langsung memengaruhi rekomendasi ban & pick."
      onClose={onClose}
    >
      <div className="card p-3.5">
        <HeroPicker
          label="Tambah hero andalan"
          value={[]}
          max={99}
          hideCounter
          exclude={items.map((i) => i.heroId)}
          onChange={add}
        />
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">
          Belum ada hero andalan tersimpan. Cari &amp; pilih hero di atas.
        </p>
      )}

      {LANES.map((lane) => {
        const group = byLane.get(lane) ?? [];
        if (!group.length) return null;
        return (
          <section key={lane}>
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold mb-2">
              {lane} <span className="text-slate-600">({group.length})</span>
            </h3>
            <div className="space-y-2">
              {group.map((it, idx) => {
                const h = getHeroById(it.heroId);
                if (!h) return null;
                return (
                  <div key={it.heroId} className="card p-3">
                    <div className="flex items-center gap-3">
                      <HeroAvatar hero={h} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{h.name}</div>
                        <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full border ${masteryColor[it.masteryLevel]}`}>
                          {it.masteryLevel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => move(it.heroId, -1)}
                          className="w-8 h-7 rounded-lg bg-white/5 text-xs disabled:opacity-25 active:scale-90"
                          aria-label="Naikkan prioritas"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === group.length - 1}
                          onClick={() => move(it.heroId, 1)}
                          className="w-8 h-7 rounded-lg bg-white/5 text-xs disabled:opacity-25 active:scale-90"
                          aria-label="Turunkan prioritas"
                        >
                          ▼
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(it.heroId)}
                        className="w-9 h-9 rounded-xl text-rose-300 bg-rose-500/10 active:scale-90"
                        aria-label={`Hapus ${h.name}`}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2.5">
                      <select
                        value={it.masteryLevel}
                        onChange={(e) => patch(it.heroId, { masteryLevel: e.target.value as MasteryLevel })}
                        className="bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs"
                      >
                        {MASTERY.map((m) => (
                          <option key={m} value={m} className="bg-[#141a2e]">
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={it.primaryLane}
                        onChange={(e) => patch(it.heroId, { primaryLane: e.target.value as Lane })}
                        className="bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs"
                      >
                        {LANES.map((l) => (
                          <option key={l} value={l} className="bg-[#141a2e]">
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-[11px] text-slate-500">
        Catatan: Daftar ini tersimpan di browser perangkatmu dan bukan statistik resmi dari akun game.
      </p>
    </Sheet>
  );
}

export function CounterDrawer({ onClose }: { onClose: () => void }) {
  const [enemies, setEnemies] = useState<string[]>([]);
  const [heroPower] = useHeroPower();
  const [onlyHP, setOnlyHP] = useState(false);

  const results = useMemo(() => analyzeEnemyCounters(enemies, heroPower), [enemies, heroPower]);
  const shown = onlyHP ? results.filter((r) => r.isHeroPower) : results;

  return (
    <Sheet title="🛡️ Cek Counter Cepat" subtitle="Pilih hero lawan untuk melihat counter paling efektif." onClose={onClose}>
      <div className="card p-3.5">
        <HeroPicker label="Hero lawan" value={enemies} onChange={setEnemies} max={5} accent="red" />
      </div>

      {enemies.length > 0 && (
        <>
          <AiNote />
          {heroPower.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={onlyHP}
                onChange={(e) => setOnlyHP(e.target.checked)}
                className="w-4 h-4 accent-[#f4c430]"
              />
              Tampilkan hanya Hero Power saya
            </label>
          )}
          {COUNTER_GROUPS.map((g) => {
            const list = shown.filter((r) => r.category === g.key);
            if (!list.length) return null;
            return (
              <section key={g.key} className="space-y-2">
                <div>
                  <h3 className="text-xs font-bold">{g.title}</h3>
                  <p className="text-[11px] text-slate-500">{g.hint}</p>
                </div>
                {list.map((c) => (
                  <CounterCard key={c.hero.id} c={c} />
                ))}
              </section>
            );
          })}
          {shown.length === 0 && (
            <div className="card p-3.5 text-xs text-slate-400">
              Tidak ada Hero Power yang cocok. Matikan filter untuk melihat semua opsi.
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

function StatBar({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-slate-400">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#c99a2e] to-[#f4c430]" style={{ width: `${v * 10}%` }} />
      </div>
      <span className="w-6 text-right text-slate-300">{v}</span>
    </div>
  );
}

export function HeroesDrawer({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState<Role | "All">("All");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Hero | null>(null);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return MLBB_HEROES.filter((h) => (role === "All" || h.roles.includes(role)) && (!query || h.name.toLowerCase().includes(query))).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [role, q]);

  return (
    <Sheet
      title={selected ? selected.name : `📚 Database Hero (${MLBB_HEROES.length})`}
      subtitle={selected ? `${selected.roles.join(" / ")} · ${selected.lanes.join(", ")}` : "Ketuk hero untuk melihat detail fase & stat."}
      onClose={onClose}
    >
      {selected ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="px-3 py-1.5 rounded-xl bg-white/5 text-xs font-semibold text-[#f4c430]"
          >
            ← Kembali ke daftar hero
          </button>
          <div className="flex items-center gap-3">
            <HeroAvatar hero={selected} size={64} />
            <div>
              <h3 className="text-xl font-black">{selected.name}</h3>
              <p className="text-xs text-slate-400">
                {selected.roles.join(" / ")} · {selected.lanes.join(", ")} · {selected.damageType}
              </p>
              <p className="text-xs text-slate-500">{selected.specialties.join(", ")}</p>
            </div>
          </div>
          <PhaseRow early={selected.earlyStrength} mid={selected.midStrength} late={selected.lateStrength} />
          <div className="space-y-1.5">
            <StatBar label="Durability" v={selected.durability} />
            <StatBar label="Offense" v={selected.offense} />
            <StatBar label="Control" v={selected.controlEffect} />
            <StatBar label="Difficulty" v={selected.difficulty} />
          </div>
          <div className="space-y-2 text-xs">
            <p>
              <b className="text-emerald-300">Early:</b> <span className="text-slate-300">{selected.earlyNotes}</span>
            </p>
            <p>
              <b className="text-amber-300">Mid:</b> <span className="text-slate-300">{selected.midNotes}</span>
            </p>
            <p>
              <b className="text-rose-300">Late:</b> <span className="text-slate-300">{selected.lateNotes}</span>
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            Analisis fase berbasis kemampuan hero, bukan statistik resmi. Sumber:{" "}
            <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              mobilelegends.com
            </a>
          </p>
        </div>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari hero…"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#f4c430]/60"
          />
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition active:scale-95 ${
                  role === r ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-white/10 text-slate-400"
                }`}
              >
                {r === "All" ? "Semua" : r}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {list.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelected(h)}
                className="card p-2 flex flex-col items-center active:scale-95 transition"
              >
                <HeroAvatar hero={h} size={56} />
                <span className="text-xs font-semibold mt-1.5 truncate w-full text-center">{h.name}</span>
                <span className="text-[10px] text-slate-500 truncate w-full text-center">{h.roles[0]}</span>
              </button>
            ))}
          </div>
          {list.length === 0 && <p className="text-center text-xs text-slate-500 py-8">Hero tidak ditemukan.</p>}
        </>
      )}
    </Sheet>
  );
}
