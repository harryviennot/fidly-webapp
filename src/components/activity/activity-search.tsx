"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";

interface ActivitySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ActivitySearch({ value, onChange }: ActivitySearchProps) {
  const t = useTranslations("activity");
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (next: string) => {
    setLocal(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), 300);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="relative">
      <MagnifyingGlassIcon
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
      />
      <Input
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="pl-9 h-9"
      />
    </div>
  );
}
