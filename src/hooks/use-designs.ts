import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDesigns,
  getActiveDesign,
  deleteDesign,
  activateDesign,
  duplicateDesign,
} from "@/api";

export const designKeys = {
  all: (businessId: string) => ["designs", businessId] as const,
  active: (businessId: string) =>
    ["designs", businessId, "active"] as const,
};

export function useDesigns(businessId: string | undefined) {
  return useQuery({
    queryKey: designKeys.all(businessId!),
    queryFn: () => getDesigns(businessId!),
    enabled: !!businessId,
  });
}

export function useActiveDesign(businessId: string | undefined) {
  return useQuery({
    queryKey: designKeys.active(businessId!),
    queryFn: () => getActiveDesign(businessId!),
    enabled: !!businessId,
  });
}

export function useDeleteDesign(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (designId: string) => deleteDesign(businessId!, designId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.all(businessId!) });
      queryClient.invalidateQueries({ queryKey: designKeys.active(businessId!) });
    },
  });
}

export function useActivateDesign(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (designId: string) => activateDesign(businessId!, designId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.all(businessId!) });
      queryClient.invalidateQueries({ queryKey: designKeys.active(businessId!) });
    },
  });
}

export function useDuplicateDesign(businessId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (designId: string) => duplicateDesign(businessId!, designId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.all(businessId!) });
    },
  });
}
