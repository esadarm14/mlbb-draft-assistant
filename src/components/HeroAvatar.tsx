"use client";
import { useState } from "react";
import type { Hero } from "@/lib/types";

const roleTheme: Record<string, { ring: string; bg: string; text: string }> = {
  Tank: { ring: "ring-blue-400/50", bg: "from-blue-900/90 via-slate-800 to-slate-950", text: "text-blue-300" },
  Fighter: { ring: "ring-red-400/50", bg: "from-rose-900/90 via-slate-800 to-slate-950", text: "text-rose-300" },
  Assassin: { ring: "ring-purple-400/50", bg: "from-purple-900/90 via-slate-800 to-slate-950", text: "text-purple-300" },
  Mage: { ring: "ring-indigo-400/50", bg: "from-indigo-900/90 via-slate-800 to-slate-950", text: "text-indigo-300" },
  Marksman: { ring: "ring-amber-400/50", bg: "from-amber-900/90 via-slate-800 to-slate-950", text: "text-amber-300" },
  Support: { ring: "ring-emerald-400/50", bg: "from-emerald-900/90 via-slate-800 to-slate-950", text: "text-emerald-300" },
};

export function HeroAvatar({ hero, size = 40, className = "" }: { hero: Hero; size?: number; className = "" }) {
  const [failed, setFailed] = useState(false);
  const theme = roleTheme[hero.roles[0]] ?? {
    ring: "ring-white/20",
    bg: "from-slate-700 to-slate-900",
    text: "text-[#f4c430]",
  };
  const src = hero.portraitUrl?.startsWith("/") ? hero.portraitUrl : `/heroes/${hero.id}.png`;
  const showImg = !failed;
  const initials = hero.name.slice(0, 2).toUpperCase();

  return (
    <div
      className={`relative shrink-0 rounded-xl overflow-hidden bg-gradient-to-br ${theme.bg} ring-1 ${theme.ring} ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className={`absolute inset-0 flex items-center justify-center font-black tracking-tight ${theme.text}`}
        style={{ fontSize: Math.max(10, Math.round(size * 0.36)) }}
        aria-hidden={showImg}
      >
        {initials}
      </span>
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={hero.name}
          onError={() => setFailed(true)}
          className="relative w-full h-full object-cover"
        />
      )}
    </div>
  );
}
