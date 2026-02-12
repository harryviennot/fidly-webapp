"use client";

import { useTranslations } from "next-intl";
import { UsersThreeIcon } from "@phosphor-icons/react";

export function EmptyCustomersState() {
  const t = useTranslations("customers.emptyState");

  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] mb-6">
        <UsersThreeIcon
          size={40}
          weight="duotone"
          className="text-[var(--accent)]"
        />
      </div>
      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
        {t("title")}
      </h3>
      <p className="text-[var(--muted-foreground)] max-w-md">
        {t("description")}
      </p>
    </div>
  );
}
