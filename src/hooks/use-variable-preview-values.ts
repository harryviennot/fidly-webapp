'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/business-context';
import { useDefaultProgram } from '@/hooks/use-programs';
import { isStampProgram } from '@/types';
import { getMyProfile } from '@/api';

/**
 * Real-data overrides for `renderSamplePreview` in card previews: the
 * business's actual name and reward name, the program's stamp goal, and the
 * signed-in user's own first name standing in for the cardholder. Keys that
 * haven't loaded (or aren't set) are omitted so the generic samples from
 * `template-variables.ts` fill the gaps.
 */
export function useVariablePreviewValues(): Record<string, string> {
  const { currentBusiness } = useBusiness();
  const { data: program } = useDefaultProgram(currentBusiness?.id);
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
    staleTime: 5 * 60_000,
  });

  const totalStamps = isStampProgram(program) ? program.config.total_stamps : undefined;

  return useMemo(() => {
    const overrides: Record<string, string> = {};
    const businessName = currentBusiness?.name?.trim();
    if (businessName) overrides.business_name = businessName;
    const rewardName = program?.reward_name?.trim();
    if (rewardName) overrides.reward_name = rewardName;
    if (typeof totalStamps === 'number' && totalStamps > 0) {
      overrides.total_stamps = String(totalStamps);
    }
    const firstName = profile?.name?.trim().split(/\s+/)[0];
    if (firstName) overrides.customer_first_name = firstName;
    return overrides;
  }, [currentBusiness?.name, program?.reward_name, totalStamps, profile?.name]);
}
