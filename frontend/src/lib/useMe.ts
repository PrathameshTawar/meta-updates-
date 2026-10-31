"use client";

import { useEffect, useState } from "react";
import type { Member } from "./api";

// Remembers which family member is using this device.
// shortcut: per-browser choice with no login, so anyone can pick any name; replace with real auth.
export function useMe(storageKey: string, members: Member[]) {
  const [id, setId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setId(Number(saved));
    } catch {}
  }, [storageKey]);

  const choose = (next: number | null) => {
    setId(next);
    try {
      if (next === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, String(next));
    } catch {}
  };

  // A saved id for a member who was removed counts as nobody.
  const me = members.find((m) => m.id === id) ?? null;
  return [me, choose] as const;
}

// "Rohan (बेंगळुरू)" -> "Rohan"
export const firstName = (name: string) => name.split(" (")[0];
