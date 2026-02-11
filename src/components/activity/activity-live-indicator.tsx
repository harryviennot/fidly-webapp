"use client";

import { useTranslations } from "next-intl";

export function ActivityLiveIndicator() {
  const t = useTranslations("activity");

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className="text-xs font-medium text-green-600">{t("live")}</span>
    </div>
  );
}
