"use client";

import { useSyncExternalStore } from "react";
import { readLastLogin, type LastLogin } from "./last-login";

let cachedRaw: string | null = null;
let cachedValue: LastLogin | null = null;

function getSnapshot(): LastLogin | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie;
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = readLastLogin();
  return cachedValue;
}

function getServerSnapshot(): LastLogin | null {
  return null;
}

function subscribe(): () => void {
  return () => {};
}

export function useLastLogin(): LastLogin | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
