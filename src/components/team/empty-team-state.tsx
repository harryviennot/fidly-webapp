"use client";

import {
  UserPlusIcon,
  DeviceMobileIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface EmptyTeamStateProps {
  onInvite: () => void;
}

const ROLES = [
  {
    icon: ShieldCheckIcon,
    title: "Admin",
    description: "Manage team members, view analytics, and configure settings",
  },
  {
    icon: DeviceMobileIcon,
    title: "Scanner",
    description: "Scan customer passes and add stamps via the mobile app",
  },
];

export function EmptyTeamState({ onInvite }: EmptyTeamStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      {/* Icon composition */}
      <div className="relative mb-6">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]">
          <UsersThreeIcon
            size={40}
            weight="duotone"
            className="text-[var(--accent)]"
          />
        </div>
        <div className="absolute -bottom-2 -right-2 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent)] text-white">
          <UserPlusIcon size={16} weight="bold" />
        </div>
      </div>

      {/* Headline */}
      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
        Build your team
      </h3>
      <p className="text-[var(--muted-foreground)] max-w-md mb-8">
        Add team members so your employees can scan loyalty cards and help manage your business.
      </p>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-8">
        {ROLES.map((role) => (
          <div
            key={role.title}
            className="flex flex-col items-center p-4 rounded-xl border border-[var(--border)] bg-[var(--cream)]"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--muted)] mb-3">
              <role.icon
                size={20}
                weight="duotone"
                className="text-[var(--muted-foreground)]"
              />
            </div>
            <h4 className="font-medium text-[var(--foreground)] mb-1">
              {role.title}
            </h4>
            <p className="text-xs text-[var(--muted-foreground)] text-center">
              {role.description}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Button
        onClick={onInvite}
        className="px-6"
        style={{
          background: "var(--accent)",
          color: "white",
        }}
      >
        <UserPlusIcon className="mr-2 h-4 w-4" />
        Invite your first team member
      </Button>
    </div>
  );
}
