"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/account/session-provider";
import { ApiError } from "@/lib/api/client";
import { accountApi } from "./api";
import type { Profile } from "./types";

export type ProfileState =
  | { status: "loading" }
  | { status: "ready"; profile: Profile }
  | { status: "error"; message: string };

/** The signed-in student's own profile. A 401 ends the session on screen (the server has already ended it). */
export function useProfile(): {
  state: ProfileState;
  reload: () => Promise<void>;
} {
  const { expire } = useSession();
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  const reload = useCallback(async () => {
    try {
      setState({ status: "ready", profile: await accountApi.profile() });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expire();
      setState({
        status: "error",
        message:
          e instanceof Error ? e.message : "Your profile could not be loaded.",
      });
    }
  }, [expire]);

  useEffect(() => {
    // a one-time read of the server's answer, which is exactly what an effect is for
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return { state, reload };
}
