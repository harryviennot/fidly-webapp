"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SignOut } from "@phosphor-icons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-provider";
import { useBusiness } from "@/contexts/business-context";
import { getMyProfile } from "@/api";
import type { User } from "@/types";

export function NavUser() {
  const { user, signOut } = useAuth();
  const { currentRole } = useBusiness();
  const [profile, setProfile] = useState<User | null>(null);
  const t = useTranslations();

  useEffect(() => {
    getMyProfile().then(setProfile).catch(console.error);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const initials = getInitials(displayName);
  const roleLabel = currentRole ? t(`roles.${currentRole}`) : "";

  return (
    <Link
      href="/account"
      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--muted)] group"
    >
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarImage src={profile?.avatar_url} className="rounded-lg object-cover" />
        <AvatarFallback className="rounded-lg bg-[var(--accent)] text-white text-xs font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="truncate text-sm font-medium text-[var(--foreground)]">
          {displayName}
        </span>
        <span className="truncate text-[11px] text-[var(--muted-foreground)]">
          {roleLabel}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          signOut();
        }}
        className="shrink-0 p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--border)] transition-colors opacity-0 group-hover:opacity-100"
        title={t("userMenu.logOut")}
      >
        <SignOut className="h-4 w-4" />
      </button>
    </Link>
  );
}
