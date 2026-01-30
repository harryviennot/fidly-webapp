"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MembershipWithUser, MembershipRole } from "@/types";

interface TeamMemberCardProps {
  member: MembershipWithUser;
  isCurrentUser: boolean;
  isLastOwner: boolean;
  canModify: boolean;
  loading: boolean;
  onChangeRole: () => void;
  onRemove: () => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getActivityStatus(lastActive: string | undefined): {
  status: "active" | "inactive" | "never";
  label: string;
} {
  if (!lastActive) {
    return { status: "never", label: "Never active" };
  }

  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const diffDays = Math.floor(
    (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 7) {
    return { status: "active", label: "Active this week" };
  }
  return { status: "inactive", label: `${diffDays} days ago` };
}

const ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  owner: "Full access to all features",
  admin: "Can manage team & settings",
  scanner: "Can scan passes",
};

const ROLE_VARIANTS: Record<MembershipRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  scanner: "outline",
};

const STATUS_COLORS = {
  active: "bg-green-500",
  inactive: "bg-amber-500",
  never: "bg-gray-400",
};

export function TeamMemberCard({
  member,
  isCurrentUser,
  isLastOwner,
  canModify,
  loading,
  onChangeRole,
  onRemove,
}: TeamMemberCardProps) {
  const activity = getActivityStatus(member.last_active_at);

  return (
    <div className="relative flex flex-col p-4 rounded-xl border border-[var(--border)] bg-[var(--cream)] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Actions menu */}
      {canModify && (
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={loading}
              >
                <DotsThreeIcon size={16} weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onChangeRole}>
                Change Role
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onRemove}
                className="text-destructive"
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Avatar with activity indicator */}
      <div className="flex flex-col items-center text-center mb-3">
        <div className="relative mb-3">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-[var(--muted)] text-lg">
              {getInitials(member.user.name || member.user.email)}
            </AvatarFallback>
          </Avatar>
          {member.role === "scanner" && (
            <span
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[var(--cream)] ${STATUS_COLORS[activity.status]}`}
              title={activity.label}
            />
          )}
        </div>

        {/* Name & Email */}
        <h4 className="font-medium text-[var(--foreground)] truncate max-w-full">
          {member.user.name || "Unnamed"}
          {isCurrentUser && (
            <span className="text-[var(--muted-foreground)] font-normal ml-1">
              (you)
            </span>
          )}
        </h4>
        <p className="text-sm text-[var(--muted-foreground)] truncate max-w-full">
          {member.user.email}
        </p>
      </div>

      {/* Role badge & info */}
      <div className="flex flex-col items-center gap-2 pt-3 border-t border-[var(--border)]">
        <Badge variant={ROLE_VARIANTS[member.role]} className="capitalize">
          {member.role}
        </Badge>
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          {ROLE_DESCRIPTIONS[member.role]}
        </p>
        {member.role === "scanner" && (
          <p
            className={`text-xs ${
              activity.status === "active"
                ? "text-green-600 dark:text-green-400"
                : "text-[var(--muted-foreground)]"
            }`}
          >
            {activity.label}
          </p>
        )}
      </div>
    </div>
  );
}

export function TeamMemberCardSkeleton() {
  return (
    <div className="flex flex-col items-center p-4 rounded-xl border border-[var(--border)] bg-[var(--cream)]">
      <div className="w-16 h-16 rounded-full bg-[var(--muted)] animate-pulse mb-3" />
      <div className="h-5 w-24 bg-[var(--muted)] rounded animate-pulse mb-2" />
      <div className="h-4 w-32 bg-[var(--muted)] rounded animate-pulse mb-4" />
      <div className="w-full border-t border-[var(--border)] pt-3 flex flex-col items-center gap-2">
        <div className="h-5 w-16 bg-[var(--muted)] rounded-full animate-pulse" />
        <div className="h-3 w-28 bg-[var(--muted)] rounded animate-pulse" />
      </div>
    </div>
  );
}
