import { useAuth } from "@/contexts/auth-provider";

export function useIsSuperadmin(): boolean {
  const { user } = useAuth();
  const meta = user?.app_metadata as Record<string, unknown> | undefined;
  return Boolean(meta?.is_superadmin);
}
