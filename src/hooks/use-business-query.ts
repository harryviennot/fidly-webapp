import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBusiness } from "@/api";
import type { BusinessUpdate } from "@/types/business";
import { createClient } from "@/utils/supabase/client";

export const businessKeys = {
  memberships: (userId: string) => ["business", "memberships", userId] as const,
};

export async function fetchMemberships(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("id, role, businesses(*)")
    .eq("user_id", userId);
  if (error) throw new Error("Failed to load memberships");
  return data ?? [];
}

export function useUpdateBusiness(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BusinessUpdate) => updateBusiness(businessId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
    },
  });
}
