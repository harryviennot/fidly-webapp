"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useBusiness } from "@/contexts/business-context";
import { getTransactions } from "@/api";
import type { TransactionResponse, TransactionType } from "@/types";
import { ActivityFilters, ActivityFiltersSkeleton } from "@/components/activity/activity-filters";
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/activity/activity-feed";
import { toast } from "sonner";

const PAGE_SIZE = 50;

export default function ActivityPage() {
  const { currentBusiness } = useBusiness();
  const t = useTranslations("activity");
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchData = useCallback(
    async (append = false) => {
      if (!currentBusiness?.id) return;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const offset = append ? transactions.length : 0;
        const params: Record<string, unknown> = { limit: PAGE_SIZE, offset };
        if (typeFilter !== "all") {
          params.type = typeFilter;
        }

        const data = await getTransactions(currentBusiness.id, params as {
          type?: string;
          limit?: number;
          offset?: number;
        });

        if (append) {
          setTransactions((prev) => [...prev, ...data.transactions]);
        } else {
          setTransactions(data.transactions);
        }
        setHasMore(data.has_more);
      } catch {
        toast.error(t("loadFailed"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentBusiness?.id, typeFilter]
  );

  useEffect(() => {
    setTransactions([]);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, typeFilter]);

  const handleFilterChange = (filter: TransactionType | "all") => {
    setTypeFilter(filter);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <ActivityFiltersSkeleton />
        <ActivityFeedSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("title")}</h2>

      <ActivityFilters selected={typeFilter} onSelect={handleFilterChange} />

      <ActivityFeed
        transactions={transactions}
        loading={false}
        hasMore={hasMore}
        onLoadMore={() => fetchData(true)}
        loadingMore={loadingMore}
      />
    </div>
  );
}
