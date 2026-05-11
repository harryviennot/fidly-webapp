"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useListViewPreference<T extends string>(
  storageKey: string,
  defaultValue: T,
): [T, (next: T) => void] {
  const getSnapshot = () => {
    if (typeof window === "undefined") return defaultValue;
    return (window.localStorage.getItem(storageKey) as T | null) ?? defaultValue;
  };
  const getServerSnapshot = () => defaultValue;

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback(
    (next: T) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next);
        // useSyncExternalStore reacts to "storage" events from other tabs.
        // Dispatch a synthetic one to notify the hook in this tab too.
        window.dispatchEvent(new StorageEvent("storage", { key: storageKey, newValue: next }));
      }
    },
    [storageKey],
  );

  return [value, update];
}
