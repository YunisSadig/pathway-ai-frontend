"use client";

import { useEffect, useState } from "react";
import { apiTimeoutMs } from "@/lib/api/client";

/**
 * Progress messages for a request that takes long (the free-tier backend sleeps when idle and needs up to about two minutes to wake):
 * 0 = normal, 1 = "a little longer than usual / the service may be waking up", 2 = "still waiting". The thresholds scale with the request
 * timeout so a test with a short timeout still shows both. Nothing here stops or retries the request.
 */
export function useSlowPhase(active: boolean): 0 | 1 | 2 {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    if (!active) return;
    const total = apiTimeoutMs();
    const first = setTimeout(() => setPhase(1), Math.min(4000, total / 4));
    const second = setTimeout(() => setPhase(2), Math.min(30_000, total / 2));
    return () => {
      clearTimeout(first);
      clearTimeout(second);
      setPhase(0); // the next request starts from "normal"
    };
  }, [active]);
  return active ? phase : 0;
}
