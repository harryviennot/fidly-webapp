"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/api/client";
import { useImpersonation } from "@/contexts/impersonation-context";

const BEACON_PATH = "/admin/impersonation/page-view";
const THROTTLE_MS = 2000;

export function useImpersonationBeacon() {
  const { isImpersonating } = useImpersonation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastFireRef = useRef<{ pathname: string; at: number }>({ pathname: "", at: 0 });

  useEffect(() => {
    if (!isImpersonating || !pathname) return;
    const now = Date.now();
    const last = lastFireRef.current;
    if (last.pathname === pathname && now - last.at < THROTTLE_MS) return;
    lastFireRef.current = { pathname, at: now };

    const body = JSON.stringify({
      pathname,
      search: searchParams?.toString() ? `?${searchParams.toString()}` : undefined,
    });
    // sendBeacon is cookie-authenticated (HttpOnly impersonation cookie attached
    // automatically) and survives page-unload navigation.
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(`${API_BASE_URL}${BEACON_PATH}`, blob);
    } else {
      void fetch(`${API_BASE_URL}${BEACON_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body,
        keepalive: true,
      });
    }
  }, [isImpersonating, pathname, searchParams]);
}
