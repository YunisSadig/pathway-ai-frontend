"use client";

import { useSession } from "@/components/account/session-provider";
import { useAccountConfig } from "@/lib/account/use-account-config";

/**
 * Which experience this visitor gets: "public" (identity and official links, no account needed) or "full" (the protected program
 * catalogue). Visitors and accounts without catalogue access get the public one. When the account service cannot be read (a sleeping
 * backend, a test without it) the full experience is tried: it answers 401/403 by itself if the person may not see it.
 */
export function useCatalogueMode(): "loading" | "public" | "full" {
  const { state } = useSession();
  const { config } = useAccountConfig();
  if (config?.cataloguePublic) return "full";
  if (state.status === "loading") return "loading";
  if (state.status === "authenticated")
    return state.user.catalogueAccess ? "full" : "public";
  return state.serviceError ? "full" : "public";
}
