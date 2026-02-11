"use client";

import { useTranslations } from "next-intl";
import { Separator } from "@/components/ui/separator";
import type { TransactionResponse } from "@/types";

export type DateGroup = "today" | "yesterday" | "thisWeek" | "older";

export function ActivityDateGroupHeader({ group }: { group: DateGroup }) {
  const t = useTranslations("activity");

  return (
    <div className="flex items-center gap-3 py-2">
      <Separator className="flex-1" />
      <span className="text-xs font-medium text-[var(--muted-foreground)] whitespace-nowrap">
        {t(`dateGroups.${group}`)}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  if (date >= startOfToday) return "today";
  if (date >= startOfYesterday) return "yesterday";
  if (date >= startOfWeek) return "thisWeek";
  return "older";
}

export function groupByDate(
  transactions: TransactionResponse[]
): Map<DateGroup, TransactionResponse[]> {
  const groups = new Map<DateGroup, TransactionResponse[]>();
  const order: DateGroup[] = ["today", "yesterday", "thisWeek", "older"];

  for (const group of order) {
    groups.set(group, []);
  }

  for (const txn of transactions) {
    const group = getDateGroup(txn.created_at);
    groups.get(group)!.push(txn);
  }

  // Remove empty groups
  for (const group of order) {
    if (groups.get(group)!.length === 0) {
      groups.delete(group);
    }
  }

  return groups;
}
