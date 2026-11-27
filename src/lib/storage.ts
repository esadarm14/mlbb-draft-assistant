"use client";
import { useCallback, useEffect, useState } from "react";
import type { DraftMode, HeroPowerItem, Lane, RankTier } from "./types";

const KEYS = {
  heroPower: "mlbb.heroPower.v1",
  tier: "mlbb.tier.v1",
  recent: "mlbb.recentSearch.v1",
  myLane: "mlbb.myLane.v1",
  mode: "mlbb.mode.v1",
  side: "mlbb.side.v1",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("mlbb-storage", { detail: key }));
  } catch {
    /* storage blocked: keep working in memory */
  }
}

/** A value persisted in localStorage, synced across components and tabs. */
function usePersisted<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setValue(read(key, fallback));
    setLoaded(true);
    const sync = (e: Event) => {
      const k = e instanceof StorageEvent ? e.key : (e as CustomEvent).detail;
      if (k === key) setValue(read(key, fallback));
    };
    window.addEventListener("storage", sync);
    window.addEventListener("mlbb-storage", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mlbb-storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key]
  );

  return [value, update, loaded] as const;
}

export const useHeroPower = () => usePersisted<HeroPowerItem[]>(KEYS.heroPower, []);
export const useTier = () => usePersisted<RankTier>(KEYS.tier, "Mythic");
export const useRecentSearch = () => usePersisted<string[]>(KEYS.recent, []);
export const useMyLane = () => usePersisted<Lane | null>(KEYS.myLane, null);
export const useDraftMode = () => usePersisted<DraftMode>(KEYS.mode, "Ranked Draft");
export const useMySide = () => usePersisted<"blue" | "red">(KEYS.side, "blue");
