"use client";
import { useMemo } from "react";
import Link from "next/link";
import { HeroPicker } from "@/components/HeroPicker";
import { HeroAvatar } from "@/components/HeroAvatar";
import { useHeroPower } from "@/lib/storage";
import { getHeroById } from "@/lib/database/heroesData";
import type { HeroPowerItem, Lane, MasteryLevel } from "@/lib/types";

const LANES: Lane[] = ["EXP Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"];
const MASTERY: MasteryLevel[] = ["Main Hero", "Highly Mastered", "Comfortable", "Backup Hero"];
const masteryColor: Record<MasteryLevel, string> = {
  "Main Hero": "text-[#f4c430] border-[#f4c430]/40 bg-[#f4c430]/10",
  "Highly Mastered": "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
  Comfortable: "text-sky-300 border-sky-400/40 bg-sky-400/10",
  "Backup Hero": "text-slate-300 border-white/20 bg-white/5",
};

export default function HeroPowerPage() {
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

  /** Move within the lane group: swap priority with the neighbour in that lane. */
  const move = (id: string, dir: -1 | 1) => {
    const it = items.find((i) => i.heroId === id);
    if (!it) return;
    const group = (byLane.get(it.primaryLane) ?? []);
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
    <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
      <div>
        <h1 className="text-2xl font-black" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          MY HERO POWER
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Masukkan hero yang benar-benar kamu kuasai. Draft & Counter akan memprioritaskan hero ini. Tersimpan otomatis di HP kamu.
        </p>
      </div>

      <div className="card p-4">
        <HeroPicker label="Tambah hero andalan" value={[]} max={99} hideCounter exclude={items.map((i) => i.heroId)} onChange={add} />
      </div>

      {items.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">{items.length} hero tersimpan</span>
          <Link href="/draft" className="text-[#f4c430] font-semibold">Pakai di Draft →</Link>
        </div>
      )}

      {LANES.map((lane) => {
        const group = byLane.get(lane) ?? [];
        if (!group.length) return null;
        return (
          <section key={lane}>
            <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold mb-2">
              {lane} <span className="text-slate-600">({group.length})</span>
            </h2>
            <div className="space-y-2">
              {group.map((it, idx) => {
                const h = getHeroById(it.heroId);
                if (!h) return null;
                return (
                  <div key={it.heroId} className="card p-3">
                    <div className="flex items-center gap-3">
                      <HeroAvatar hero={h} size={48} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{h.name}</div>
                        <span className={`inline-block mt-0.5 text-[11px] px-2 py-0.5 rounded-full border ${masteryColor[it.masteryLevel]}`}>
                          {it.masteryLevel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button disabled={idx === 0} onClick={() => move(it.heroId, -1)} className="w-9 h-8 rounded-lg bg-white/5 disabled:opacity-25 active:scale-90" aria-label="Naikkan prioritas">▲</button>
                        <button disabled={idx === group.length - 1} onClick={() => move(it.heroId, 1)} className="w-9 h-8 rounded-lg bg-white/5 disabled:opacity-25 active:scale-90" aria-label="Turunkan prioritas">▼</button>
                      </div>
                      <button onClick={() => remove(it.heroId)} className="w-10 h-10 rounded-xl text-rose-300 bg-rose-500/10 active:scale-90" aria-label={`Hapus ${h.name}`}>✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <select
                        value={it.masteryLevel}
                        onChange={(e) => patch(it.heroId, { masteryLevel: e.target.value as MasteryLevel })}
                        className="bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 text-sm"
                      >
                        {MASTERY.map((m) => <option key={m} value={m} className="bg-[#141a2e]">{m}</option>)}
                      </select>
                      <select
                        value={it.primaryLane}
                        onChange={(e) => patch(it.heroId, { primaryLane: e.target.value as Lane })}
                        className="bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 text-sm"
                      >
                        {LANES.map((l) => <option key={l} value={l} className="bg-[#141a2e]">{l}</option>)}
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
        Catatan: &quot;Hero Power&quot; di sini adalah daftar hero andalan yang kamu isi sendiri — bukan statistik Hero Power resmi dari akun game.
      </p>
    </div>
  );
}
