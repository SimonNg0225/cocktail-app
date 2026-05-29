"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "favorites";

// Per-device guest favourites, persisted in localStorage (guests have no login).
export function useFavorites() {
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFavs(JSON.parse(raw));
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setFavs((cur) => {
      const next = cur.includes(id)
        ? cur.filter((x) => x !== id)
        : [...cur, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // ignore quota / private-mode errors
      }
      return next;
    });
  }, []);

  const isFav = useCallback((id: string) => favs.includes(id), [favs]);

  return { favs, toggle, isFav };
}
