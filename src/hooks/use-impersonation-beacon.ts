"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { API_BASE_URL, getAuthHeaders } from "@/api/client";
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
    // Use fetch with keepalive rather than sendBeacon: sendBeacon can't set
    // headers, so it can't carry the X-Impersonation-Token. keepalive keeps
    // the request alive across navigations the same way.
    void (async () => {
      const headers = await getAuthHeaders();
      void fetch(`${API_BASE_URL}${BEACON_PATH}`, {
        method: "POST",
        headers,
        credentials: "include",
        body,
        keepalive: true,
      });
    })();
  }, [isImpersonating, pathname, searchParams]);
}
