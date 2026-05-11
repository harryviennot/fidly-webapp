"use client";

import { useMutation, type UseMutationOptions, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

interface GuardedMutationOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  blocked: boolean;
  blockedMessage: string;
}

/**
 * `useMutation` wrapper that short-circuits when `blocked` is true.
 * Used for STA-140 impersonation read-only enforcement on the client.
 * The backend remains the source of truth — this hook is purely UX.
 */
export function useGuardedMutation<TData = unknown, TError = unknown, TVariables = void, TContext = unknown>(
  options: GuardedMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { blocked, blockedMessage, mutationFn, ...rest } = options;
  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    mutationFn: async (variables: TVariables) => {
      if (blocked) {
        toast.error(blockedMessage);
        throw new Error(blockedMessage);
      }
      if (!mutationFn) {
        throw new Error("useGuardedMutation requires a mutationFn");
      }
      return (mutationFn as (v: TVariables) => Promise<TData>)(variables);
    },
  });
}
