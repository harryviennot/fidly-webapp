import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getPrograms, updateProgram } from "@/api";
import type { LoyaltyProgram, LoyaltyProgramUpdate } from "@/types";
import { designKeys } from "./use-designs";

export const programKeys = {
  all: (businessId: string) => ["programs", businessId] as const,
  default: (businessId: string) => ["programs", businessId, "default"] as const,
};

export function useDefaultProgram(businessId: string | undefined) {
  return useQuery({
    queryKey: programKeys.default(businessId!),
    queryFn: async () => {
      const programs = await getPrograms(businessId!);
      return programs.find((p) => p.is_default) || programs[0] || null;
    },
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateProgram(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programId,
      data,
    }: {
      programId: string;
      data: LoyaltyProgramUpdate;
    }) => updateProgram(businessId!, programId, data),
    onSuccess: (updated) => {
      // Update the cached default program
      queryClient.setQueryData<LoyaltyProgram | null>(
        programKeys.default(businessId!),
        updated
      );
      // Invalidate designs (total_stamps may have changed)
      queryClient.invalidateQueries({
        queryKey: designKeys.all(businessId!),
      });
    },
  });
}
