"use client";
import { useId, useMemo, useRef, useState } from "react";
import { MLBB_HEROES, getHeroById } from "@/lib/database/heroesData";
import type { Hero, Role } from "@/lib/types";
import { HeroAvatar } from "./HeroAvatar";
import { useRecentSearch } from "@/lib/storage";

const ROLES: Role[] = ["Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"];

const accentMap = {
  gold: { chip: "border-[#f4c430]/40 bg-[#f4c430]/10", focus: "focus-within:border-[#f4c430]/60" },
  blue: { chip: "border-sky-400/40 bg-sky-400/10", focus: "focus-within:border-sky-400/60" },
  red: { chip: "border-rose-400/40 bg-rose-400/10", focus: "focus-within:border-rose-400/60" },
  gray: { chip: "border-white/20 bg-white/5", focus: "focus-within:border-white/40" },
};

export interface HeroPickerProps {
  label?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  hideCounter?: boolean;
  /** Hero ids unavailable here (picked or banned elsewhere). */
  exclude?: string[];
  accent?: keyof typeof accentMap;
  placeholder?: string;
}

function rank(query: string, roleFilter: Role | null, blocked: Set<string>): Hero[] {
  const q = query.trim().toLowerCase();
  const pool = MLBB_HEROES.filter((h) => !blocked.has(h.id) && (!roleFilter || h.roles.includes(roleFilter)));
  if (!q) return roleFilter ? pool.sort((a, b) => a.name.localeCompare(b.name)) : [];
  const starts: Hero[] = [];
  const wordStarts: Hero[] = [];
  const contains: Hero[] = [];
  for (const h of pool) {
    const n = h.name.toLowerCase();
    if (n.startsWith(q)) starts.push(h);
    else if (n.split(/[\s'-]+/).some((w) => w.startsWith(q))) wordStarts.push(h);
    else if (n.includes(q)) contains.push(h);
  }
  const byName = (a: Hero, b: Hero) => a.name.localeCompare(b.name);
  return [...starts.sort(byName), ...wordStarts.sort(byName), ...contains.sort(byName)];
}

export function HeroPicker({
  label,
  value,
  onChange,
  max = 5,
  hideCounter = false,
  exclude = [],
  accent = "gold",
  placeholder = "Ketik nama hero… (misal: ma)",
}: HeroPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [roleFilter, setRoleFilter] = useState<Role | null>(null);
  const [recent, setRecent] = useRecentSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const blocked = useMemo(() => new Set([...value, ...exclude]), [value, exclude]);
  const full = value.length >= max;

  const results = useMemo(() => rank(query, roleFilter, blocked).slice(0, 8), [query, roleFilter, blocked]);
  const recentHeroes = useMemo(
    () => recent.map((id) => getHeroById(id)).filter((h): h is Hero => !!h && !blocked.has(h.id)).slice(0, 6),
    [recent, blocked]
  );
  const showRecent = open && !query && !roleFilter && recentHeroes.length > 0;
  const list = showRecent ? recentHeroes : results;

  const select = (hero: Hero) => {
    if (blocked.has(hero.id) || full) return;
    onChange([...value, hero.id]);
    setRecent((prev) => [hero.id, ...prev.filter((id) => id !== hero.id)].slice(0, 10));
    setQuery("");
    setHighlight(0);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(list.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hero = list[highlight];
      if (hero) select(hero);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const a = accentMap[accent];

  return (
    <div className="w-full min-w-0 max-w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">{label}</span>
          {!hideCounter && (
            <span className="text-xs text-slate-400">
              {value.length}/{max}
              {value.length > 0 && (
                <button onClick={() => onChange([])} className="ml-3 text-rose-300 hover:text-rose-200 underline-offset-2 hover:underline">
                  Hapus semua
                </button>
              )}
            </span>
          )}
        </div>
      )}

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((id) => {
            const h = getHeroById(id);
            if (!h) return null;
            return (
              <span key={id} className={`flex items-center gap-1.5 pl-1 pr-1 py-1 rounded-xl border ${a.chip}`}>
                <HeroAvatar hero={h} size={28} />
                <span className="text-sm font-medium">{h.name}</span>
                <button
                  onClick={() => onChange(value.filter((v) => v !== id))}
                  aria-label={`Hapus ${h.name}`}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-white/10 active:scale-90 transition"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className={`flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 transition ${a.focus} ${full ? "opacity-50" : ""}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            disabled={full}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            placeholder={full ? `Maksimal ${max} hero` : placeholder}
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            className="flex-1 min-w-0 bg-transparent py-3.5 text-base outline-none placeholder:text-slate-500"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 px-1 text-lg" aria-label="Kosongkan">
              ×
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && !full && (list.length > 0 || query) && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-40 left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#141a2e] shadow-2xl shadow-black/60 p-1.5"
          >
            {showRecent && <li className="px-3 pt-1 pb-2 text-[11px] uppercase tracking-wider text-slate-500">Pencarian terakhir</li>}
            {list.map((h, i) => (
              <li
                key={h.id}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(h)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer ${i === highlight ? "bg-white/10" : ""}`}
              >
                <HeroAvatar hero={h} size={40} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{h.name}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {h.roles.join(" / ")} · {h.lanes.join(", ")}
                  </div>
                </div>
              </li>
            ))}
            {!showRecent && list.length === 0 && query && (
              <li className="px-3 py-4 text-sm text-slate-400 text-center">Hero &quot;{query}&quot; tidak ditemukan / sudah dipakai.</li>
            )}
          </ul>
        )}
      </div>

      {/* Role filter */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {ROLES.map((r) => (
          <button
            key={r}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setRoleFilter((cur) => (cur === r ? null : r));
              setOpen(true);
              inputRef.current?.focus();
            }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition active:scale-95 ${
              roleFilter === r ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-white/10 text-slate-400"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
