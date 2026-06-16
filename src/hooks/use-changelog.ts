import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getChangelog, markChangelogSeen } from "@/api/changelog";
import { useAuth } from "@/contexts/auth-provider";

/**
 * Recent published changelog releases + the caller's unread count. The changelog
 * is platform-global, so this is keyed on the logged-in USER (not the current
 * business). `markSeen` drops the unread count to 0 and never re-fires for the
 * same releases (mirrors the achievement acknowledge idiom).
 */
export function useChangelog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["changelog", "recent", user?.id],
    queryFn: getChangelog,
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  const seenMutation = useMutation({
    mutationFn: markChangelogSeen,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["changelog", "recent", user?.id] }),
  });

  return {
    releases: query.data?.releases ?? [],
    areas: query.data?.areas ?? [],
    unreadCount: query.data?.unread_count ?? 0,
    lastSeenAt: query.data?.last_seen_at ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    markSeen: () => seenMutation.mutate(),
  };
}
