"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  /** Called by any screen that learns the session ended (a 401 from the API). */
  expire: (deliberate?: boolean) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * The browser never holds a token: the session is an opaque HttpOnly cookie that the site's own proxy forwards to the API. This provider
 * only asks "who am I?" (GET /api/v1/account/me) and keeps the answer in memory; it is never written to localStorage or sessionStorage.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const user = await accountApi.me();
      setState({ status: "authenticated", user });
    } catch (error) {
      const unauthenticated = error instanceof ApiError && error.status === 401;
      setState({ status: "anonymous", serviceError: !unauthenticated });
    }
  }, []);

  useEffect(() => {
    // a one-time read of the server's answer, which is exactly what an effect is for
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const expire = useCallback(
    (deliberate = false) =>
      setState({ status: "anonymous", serviceError: false, loggedOut: deliberate }),
    [],
  );

  const logout = useCallback(async () => {
    try {
      await accountApi.logout();
    } finally {
      // a deliberate log out: the page that is open must not bounce to the login page before the caller navigates home
      setState({ status: "anonymous", serviceError: false, loggedOut: true });
    }
  }, []);

  const value = useMemo(
    () => ({ state, refresh, expire, logout }),
    [state, refresh, expire, logout],
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
