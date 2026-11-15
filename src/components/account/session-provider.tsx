"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiError } from "@/lib/api/client";
import { accountApi } from "@/lib/account/api";
import type { Account } from "@/lib/account/types";

export type SessionState =
  | { status: "loading" }
  | { status: "anonymous"; serviceError: boolean; loggedOut?: boolean }
  | { status: "authenticated"; user: Account };

interface SessionContextValue {
  state: SessionState;
  /** Re-reads the session from the server (after login, profile name change, ...). */
  refresh: () => Promise<void>;
  /** Sets the signed-in state from the account the login/registration response already returned (no extra round trip to wait on). */
  signIn: (user: Account) => void;
  /** Called by any screen that learns the session ended (a 401 from the API). */
  expire: (deliberate?: boolean) => void;
  logout: () => Promise<void>;
  /** A picture was uploaded or removed: every screen showing the account's picture updates at once. */
  setAvatar: (present: boolean, version: number) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Pauses between background re-reads while the API cannot be reached (about 2.5 minutes in total: a cold start takes up to two). */
export const RETRY_DELAYS_MS = [3000, 8000, 20000, 45000, 75000];

/**
 * The browser never holds a token: the session is an opaque HttpOnly cookie that the site's own proxy forwards to the API. This provider
 * only asks "who am I?" (GET /api/v1/account/me) and keeps the answer in memory; it is never written to localStorage or sessionStorage.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  // Every change of who is signed in takes a new number; an answer that arrives for an older number is ignored, so a slow
  // "who am I?" can never undo a login, resurrect a session after log out, or overwrite a newer answer.
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++generation.current;
    try {
      const user = await accountApi.me();
      if (mine === generation.current)
        setState({ status: "authenticated", user });
    } catch (error) {
      const unauthenticated = error instanceof ApiError && error.status === 401;
      if (mine === generation.current)
        setState({ status: "anonymous", serviceError: !unauthenticated });
    }
  }, []);

  useEffect(() => {
    // a one-time read of the server's answer, which is exactly what an effect is for
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // A sleeping or briefly unavailable API must not look like being logged out: keep asking with growing pauses (and again whenever
  // the browser comes back online or the tab is shown), and switch to the signed-in state as soon as the answer arrives.
  const unavailable = state.status === "anonymous" && state.serviceError;
  useEffect(() => {
    if (!unavailable) return;
    let attempt = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (cancelled || attempt >= RETRY_DELAYS_MS.length) return;
      timer = setTimeout(() => {
        attempt += 1;
        void refresh().then(schedule);
      }, RETRY_DELAYS_MS[attempt]);
    };
    const soon = () => {
      clearTimeout(timer);
      void refresh().then(schedule); // the chain goes on if the API is still unreachable
    };
    schedule();
    window.addEventListener("online", soon);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("online", soon);
    };
  }, [unavailable, refresh]);

  const signIn = useCallback((user: Account) => {
    generation.current += 1;
    setState({ status: "authenticated", user });
  }, []);

  const expire = useCallback((deliberate = false) => {
    generation.current += 1;
    setState({
      status: "anonymous",
      serviceError: false,
      loggedOut: deliberate,
    });
  }, []);

  const logout = useCallback(async () => {
    generation.current += 1; // anything still in flight belongs to the session that is ending
    try {
      await accountApi.logout();
    } finally {
      generation.current += 1;
      // a deliberate log out: the page that is open must not bounce to the login page before the caller navigates home
      setState({ status: "anonymous", serviceError: false, loggedOut: true });
    }
  }, []);

  const setAvatar = useCallback(
    (present: boolean, version: number) =>
      setState((s) =>
        s.status === "authenticated"
          ? { ...s, user: { ...s.user, avatar: { present, version } } }
          : s,
      ),
    [],
  );

  const value = useMemo(
    () => ({ state, refresh, signIn, expire, logout, setAvatar }),
    [state, refresh, signIn, expire, logout, setAvatar],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/** Only same-site paths are accepted as a "go back to" target (no open redirect). */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//"))
    return "/dashboard";
  if (next.includes("\\") || /[\u0000-\u001f]/.test(next)) return "/dashboard";
  return next;
}

/**
 * For pages that need a signed-in student. Signed-out visitors are sent to the login page and brought back afterwards. The server
 * enforces access on every request anyway; this only avoids showing an empty page.
 */
export function useRequireSession(): SessionState {
  const { state } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (
      state.status === "anonymous" &&
      !state.serviceError &&
      !state.loggedOut
    ) {
      const here = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(here)}&reason=required`);
    }
  }, [state, router]);
  return state;
}
