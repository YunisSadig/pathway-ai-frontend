"use client";

import { useEffect, useState } from "react";
import { accountApi } from "./api";
import type { AccountConfig } from "./types";

/** What the service can do right now (sign-up open? email delivery working?). `null` while loading or when it cannot be read. */
export function useAccountConfig(): {
  config: AccountConfig | null;
  failed: boolean;
} {
  const [config, setConfig] = useState<AccountConfig | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    accountApi
      .config()
      .then((c) => live && setConfig(c))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  return { config, failed };
}
