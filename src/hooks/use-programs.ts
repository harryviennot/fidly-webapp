import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { createProgram, getPrograms, updateProgram } from "@/api";
import type { LoyaltyProgram, LoyaltyProgramUpdate, ProgramCreate } from "@/types";
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

export function useCreateProgram(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProgramCreate) => createProgram(businessId!, data),
    onSuccess: (created) => {
      // Backend deletes+recreates the default program, so the cached row is
      // stale — replace it and refetch the list.
      queryClient.setQueryData<LoyaltyProgram | null>(
        programKeys.default(businessId!),
        created
      );
      queryClient.invalidateQueries({ queryKey: programKeys.all(businessId!) });
      // The old program's designs no longer match the new type.
      queryClient.invalidateQueries({ queryKey: designKeys.all(businessId!) });
    },
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
