"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "@/components/account/session-provider";
import { accountApi } from "@/lib/account/api";
import { ApiError } from "@/lib/api/client";
import type { SavedItems } from "@/lib/account/types";

const EMPTY: SavedItems = {
  programs: [],
  universities: [],
  catalogueVisible: false,
};

interface SavedContextValue {
  items: SavedItems;
  /** True once the list was read for the signed-in student. */
  ready: boolean;
  error: string | null;
  isProgramSaved: (identifier: string) => boolean;
  isUniversitySaved: (slug: string) => boolean;
  toggleProgram: (identifier: string) => Promise<void>;
  toggleUniversity: (slug: string) => Promise<void>;
  reload: () => Promise<void>;
}

const SavedContext = createContext<SavedContextValue | null>(null);

/** Loads the signed-in student's saved items once and keeps them in memory so every Save button agrees. */
export function SavedProvider({ children }: { children: React.ReactNode }) {
  const { state, expire } = useSession();
  const signedIn = state.status === "authenticated";
  const [items, setItems] = useState<SavedItems>(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setItems(await accountApi.saved());
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expire();
      setError(
        e instanceof Error ? e.message : "Saved items could not be loaded.",
      );
    } finally {
      setReady(true);
    }
  }, [expire]);

  useEffect(() => {
    // reacts to the session: read the list when someone signs in, forget it when they sign out
    /* eslint-disable react-hooks/set-state-in-effect */
    if (signedIn) {
      void reload();
    } else {
      setItems(EMPTY);
      setReady(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [signedIn, reload]);

  const toggleProgram = useCallback(
    async (identifier: string) => {
      const saved = items.programs.some((p) => p.identifier === identifier);
      try {
        if (saved) await accountApi.unsaveProgram(identifier);
        else await accountApi.saveProgram(identifier);
        await reload();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) expire();
        throw e;
      }
    },
    [items.programs, reload, expire],
  );

  const toggleUniversity = useCallback(
    async (slug: string) => {
      const saved = items.universities.some((u) => u.slug === slug);
      try {
        if (saved) await accountApi.unsaveUniversity(slug);
        else await accountApi.saveUniversity(slug);
        await reload();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) expire();
        throw e;
      }
    },
    [items.universities, reload, expire],
  );

  const value = useMemo<SavedContextValue>(
    () => ({
      items,
      ready,
      error,
      isProgramSaved: (id) => items.programs.some((p) => p.identifier === id),
      isUniversitySaved: (slug) =>
        items.universities.some((u) => u.slug === slug),
      toggleProgram,
      toggleUniversity,
      reload,
    }),
    [items, ready, error, toggleProgram, toggleUniversity, reload],
  );
  return (
    <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
  );
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used inside <SavedProvider>");
  return ctx;
}
