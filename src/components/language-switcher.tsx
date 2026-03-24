"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Locale } from "@/lib/locale";
import { updateProfile } from "@/api";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const handleChange = (v: string) => {
    const newLocale = v as Locale;
    // Persist to backend (fire-and-forget)
    updateProfile({ locale: newLocale }).catch(() => {});
    // Set cookie without hard reload
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    localStorage.setItem("NEXT_LOCALE", newLocale);
    // Soft refresh — re-fetches server components (new messages) without full page reload
    router.refresh();
  };

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LOCALE_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
