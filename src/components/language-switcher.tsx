"use client";

import { useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setLocale, type Locale } from "@/lib/locale";
import { updateProfile } from "@/api";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

export function LanguageSwitcher() {
  const locale = useLocale();

  const handleChange = (v: string) => {
    const newLocale = v as Locale;
    // Persist to backend (fire-and-forget, don't block the UI reload)
    updateProfile({ locale: newLocale }).catch(() => {});
    setLocale(newLocale);
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
