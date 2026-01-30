"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { CheckIcon } from "@phosphor-icons/react"
import { StampeoLogo } from "@/components/ui/stampeo-logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useBusiness } from "@/contexts/business-context"
import { getBackgroundFromSettings, getContrastTextColor } from "@/utils/theme"

export function BusinessSwitcher() {
  const { memberships, currentBusiness, setCurrentBusiness } = useBusiness()

  const hasMultipleMemberships = memberships.length > 1

  // Theme from current business
  const bgColor = currentBusiness?.logo_url
    ? getBackgroundFromSettings(currentBusiness.settings)
    : null
  const textColor = bgColor ? getContrastTextColor(bgColor) : "dark"

  // Format role for display
  const formatRole = (role: string) =>
    role.charAt(0).toUpperCase() + role.slice(1)

  // The trigger content (existing header appearance)
  const triggerContent = (
    <>
      {currentBusiness?.logo_url ? (
        <>
          <img
            src={currentBusiness.logo_url}
            alt={currentBusiness.name}
            className="object-contain"
            style={{ height: 36, maxWidth: 100 }}
          />
          <span
            className="truncate font-bold text-lg"
            style={{
              color: textColor === "white" ? "#ffffff" : "var(--foreground)",
            }}
          >
            {currentBusiness.name}
          </span>
        </>
      ) : (
        <>
          <StampeoLogo className="w-8 h-8 text-[var(--accent)]" />
          <span
            className="truncate font-bold text-lg"
            style={{
              color: textColor === "white" ? "#ffffff" : "var(--foreground)",
            }}
          >
            {currentBusiness?.name || "Stampeo"}
          </span>
        </>
      )}
      {hasMultipleMemberships && (
        <ChevronDown
          className="ml-auto opacity-50"
          style={{
            color: textColor === "white" ? "#ffffff" : undefined,
          }}
        />
      )}
    </>
  )

  // Single membership: render static (no dropdown)
  if (!hasMultipleMemberships) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="flex items-center gap-3 px-4 py-4 cursor-default hover:bg-transparent hover:text-inherit active:bg-transparent active:text-inherit focus-visible:ring-0 focus-visible:ring-offset-0"
            style={bgColor ? { backgroundColor: bgColor } : undefined}
          >
            {triggerContent}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Multiple memberships: render with dropdown
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="flex items-center gap-3 px-4 py-4 hover:bg-transparent hover:text-inherit active:bg-transparent active:text-inherit focus-visible:ring-0 focus-visible:ring-offset-0"
              style={bgColor ? { backgroundColor: bgColor } : undefined}
            >
              {triggerContent}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Your businesses
            </DropdownMenuLabel>
            {memberships.map((membership) => {
              const isSelected = membership.business.id === currentBusiness?.id
              return (
                <DropdownMenuItem
                  key={membership.id}
                  onClick={() => setCurrentBusiness(membership.business)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border overflow-hidden">
                    {membership.business.logo_url ? (
                      <img
                        src={membership.business.logo_url}
                        alt={membership.business.name}
                        className="size-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {membership.business.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate font-medium">
                      {membership.business.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRole(membership.role)}
                    </span>
                  </div>
                  {isSelected && (
                    <CheckIcon className="size-4 text-[var(--accent)]" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
