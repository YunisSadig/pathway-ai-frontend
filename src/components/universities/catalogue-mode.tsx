"use client";

import { hadSession, useSession } from "@/components/account/session-provider";
import { useAccountConfig } from "@/lib/account/use-account-config";

/**
 * Which experience this visitor gets: "public" (identity and official links, no account needed) or "full" (the protected program
 * catalogue). Public content never waits for the session: while "who am I?" is still on its way, or the account service cannot be
 * reached (a backend that is waking up), the public catalogue is shown at once. It switches to the full catalogue only when the
 * session confirms an account with catalogue access (or the catalogue is open to everyone). The server enforces access on every
 * request either way; this only chooses what to ask for.
 */
export function useCatalogueMode(): "public" | "full" {
  const { state } = useSession();
  const { config } = useAccountConfig();
  if (config?.cataloguePublic) return "full";
  if (state.status === "authenticated" && state.user.catalogueAccess)
    return "full";
  // the account service is waking up and this browser was signed in last time: keep asking for the full catalogue (the server
  // answers 401/403 by itself if the session is gone); a first-time visitor gets the public catalogue instead of an error
  if (state.status === "anonymous" && state.serviceError && hadSession())
    return "full";
  return "public";
}
