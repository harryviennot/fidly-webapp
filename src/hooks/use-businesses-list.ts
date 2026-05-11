import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  fetchBusinessesList,
  type BusinessListParams,
  type BusinessListResponse,
} from "@/api/businesses";

export const businessesListKey = (params: BusinessListParams) =>
  ["businesses-list", params] as const;

export function useBusinessesList(params: BusinessListParams) {
  return useQuery<BusinessListResponse>({
    queryKey: businessesListKey(params),
    queryFn: () => fetchBusinessesList(params),
    placeholderData: keepPreviousData,
  });
}
