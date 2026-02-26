"use client";

import { useTranslations } from "next-intl";

export function ActivityLiveIndicator() {
  const t = useTranslations("activity");

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-[7px] w-[7px]">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4A7C59] opacity-75" />
        <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-[#4A7C59]" />
      </span>
      <span className="text-[12px] font-semibold text-[#4A7C59]">{t("live")}</span>
    </div>
  );
}
