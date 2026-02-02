"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotsThree, PencilSimple, PlusIcon } from "@phosphor-icons/react";
import { ScaledCardWrapper } from "@/components/design/ScaledCardWrapper";

// ============================================================================
// Types
// ============================================================================

export interface CardWrapperAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
}

export interface CardWrapperProps {
  /** Wrapped card content */
  children: React.ReactNode;
  /** Title below card (e.g., "Active Card") */
  title?: string;
  /** Status badge (e.g., "Live", "Draft") */
  badge?: {
    label: string;
    variant: "success" | "secondary" | "warning";
  };
  /** Dropdown menu actions */
  actions?: CardWrapperAction[];
  /** Link wrapper for the card */
  href?: string;
  /** Show hover edit indicator */
  showEditOverlay?: boolean;
  /** Empty state when no card exists */
  emptyState?: {
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
  };
  /** Show empty state (when true, ignores children) */
  isEmpty?: boolean;
  /** Responsive scaling config */
  scaling?: {
    baseWidth?: number;
    aspectRatio?: number;
    minScale?: number;
  };
  /** Additional metadata to display (e.g., "10 stamps") */
  metadata?: string;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Badge Variant Mapping
// ============================================================================

const badgeVariantStyles = {
  success: "bg-green-100 text-green-700",
  secondary: "bg-muted text-muted-foreground",
  warning: "bg-yellow-100 text-yellow-700",
};

// ============================================================================
// Main Component
// ============================================================================

export function CardWrapper({
  children,
  title,
  badge,
  actions,
  href,
  showEditOverlay = false,
  emptyState,
  isEmpty = false,
  scaling = { baseWidth: 280, aspectRatio: 1.282, minScale: 0.6 },
  metadata,
  className = "",
}: CardWrapperProps) {
  // Render empty state
  if (isEmpty && emptyState) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-xl text-center ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <PlusIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium mb-1">{emptyState.title}</p>
        <p className="text-sm text-muted-foreground mb-4">
          {emptyState.description}
        </p>
        {(emptyState.actionLabel && (emptyState.actionHref || emptyState.onAction)) && (
          <Button
            asChild={!!emptyState.actionHref}
            className="rounded-full"
            onClick={emptyState.onAction}
          >
            {emptyState.actionHref ? (
              <Link href={emptyState.actionHref}>
                <PlusIcon className="w-4 h-4 mr-2" />
                {emptyState.actionLabel}
              </Link>
            ) : (
              <>
                <PlusIcon className="w-4 h-4 mr-2" />
                {emptyState.actionLabel}
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // Card content with optional link wrapper
  const cardContent = (
    <ScaledCardWrapper
      baseWidth={scaling.baseWidth}
      aspectRatio={scaling.aspectRatio}
      minScale={scaling.minScale}
    >
      {children}
    </ScaledCardWrapper>
  );

  const cardWithOverlay = (
    <div className="relative group">
      {cardContent}
      {/* Hover Edit Icon */}
      {showEditOverlay && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md">
            <PencilSimple className="w-4 h-4 text-gray-700" />
          </div>
        </div>
      )}
    </div>
  );

  const linkedCard = href ? (
    <Link
      href={href}
      className="block transition-transform hover:scale-[1.02]"
    >
      {cardWithOverlay}
    </Link>
  ) : (
    cardWithOverlay
  );

  // No title/actions - just return the card
  if (!title && !actions?.length && !badge && !metadata) {
    return <div className={className}>{linkedCard}</div>;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {linkedCard}

      {/* Title + Badge + Actions */}
      <div className="flex items-center justify-between px-1">
        <div className="min-w-0 flex-1">
          {title && (
            <p className="font-medium text-sm truncate">{title}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {badge && (
              <Badge
                variant="secondary"
                className={badgeVariantStyles[badge.variant]}
              >
                {badge.label}
              </Badge>
            )}
            {metadata && (
              <span className="text-xs text-muted-foreground">{metadata}</span>
            )}
          </div>
        </div>

        {actions && actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1.5 hover:bg-muted rounded-lg transition-colors">
              <DotsThree className="w-5 h-5" weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action, index) => {
                if (action.disabled) return null;

                const itemContent = (
                  <>
                    {action.icon && (
                      <span className="mr-2 h-4 w-4 flex items-center justify-center">
                        {action.icon}
                      </span>
                    )}
                    {action.label}
                  </>
                );

                if (action.href) {
                  return (
                    <DropdownMenuItem key={index} asChild>
                      <Link href={action.href} className="cursor-pointer">
                        {itemContent}
                      </Link>
                    </DropdownMenuItem>
                  );
                }

                return (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    className={
                      action.destructive
                        ? "text-destructive focus:text-destructive"
                        : undefined
                    }
                  >
                    {itemContent}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export default CardWrapper;
