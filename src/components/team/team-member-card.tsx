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
  canModify,
  loading,
  onChangeRole,
  onRemove,
}: TeamMemberCardProps) {
  const activity = getActivityStatus(member.last_active_at);

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--cream)] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Avatar with activity indicator */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-[var(--muted)] text-base font-medium">
            {getInitials(member.user.name || member.user.email)}
          </AvatarFallback>
        </Avatar>
        {member.role === "scanner" && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--cream)] ${STATUS_COLORS[activity.status]}`}
            title={activity.label}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="font-medium text-[var(--foreground)] truncate">
            {member.user.name || "Unnamed"}
          </h4>
          {isCurrentUser && (
            <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0">
              (you)
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--muted-foreground)] truncate mb-2">
          {member.user.email}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant={ROLE_VARIANTS[member.role]} className="capitalize">
            {member.role}
          </Badge>
          {member.role === "scanner" && (
            <span
              className={`text-xs ${
                activity.status === "active"
                  ? "text-green-600 dark:text-green-400"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              {activity.label}
            </span>
          )}
        </div>
      </div>

      {/* Actions menu */}
      {canModify && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              disabled={loading}
            >
              <DotsThreeIcon size={18} weight="bold" />
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
      )}
    </div>
  );
}

export function TeamMemberCardSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--cream)]">
      <div className="w-12 h-12 rounded-full bg-[var(--muted)] animate-pulse flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-5 w-32 bg-[var(--muted)] rounded animate-pulse mb-2" />
        <div className="h-4 w-40 bg-[var(--muted)] rounded animate-pulse mb-3" />
        <div className="h-5 w-16 bg-[var(--muted)] rounded-full animate-pulse" />
      </div>
    </div>
  );
}
