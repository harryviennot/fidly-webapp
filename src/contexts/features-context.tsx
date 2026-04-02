'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/api/client';

/**
 * Feature configuration fetched from the backend.
 * This is the single source of truth for what each tier includes.
 */
export interface FeatureDefinition {
  type: 'boolean' | 'limit' | 'value';
  category: string;
  values: Record<string, boolean | number | string | null>;
}

export interface FeaturesConfig {
  tiers: string[];
  features: Record<string, FeatureDefinition>;
}

const FeaturesContext = createContext<FeaturesConfig | null>(null);

const featuresKeys = {
  config: ['features', 'config'] as const,
};

async function fetchFeaturesConfig(): Promise<FeaturesConfig> {
  const res = await fetch(`${API_BASE_URL}/config/features`);
  if (!res.ok) {
    throw new Error('Failed to fetch features config');
  }
  return res.json();
}

/**
 * Provider that fetches and caches the feature configuration.
 * Wrap this around the app at the root layout level.
 *
 * The config only changes on backend deploy, so we cache it
 * for the lifetime of the session (staleTime: Infinity).
 */
export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: featuresKeys.config,
    queryFn: fetchFeaturesConfig,
    staleTime: Infinity,
    retry: 2,
  });

  return (
    <FeaturesContext.Provider value={data ?? null}>
      {children}
    </FeaturesContext.Provider>
  );
}

/**
 * Access the feature configuration.
 * Returns null if not yet loaded (during SSR or before fetch completes).
 */
export function useFeatures(): FeaturesConfig | null {
  return useContext(FeaturesContext);
}

/**
 * Get a feature's value for a specific tier from the config.
 * Returns undefined if config not loaded or feature not found.
 */
export function getFeatureValue(
  config: FeaturesConfig | null,
  tier: string,
  key: string,
): boolean | number | string | null | undefined {
  if (!config) return undefined;
  const feature = config.features[key];
  if (!feature) return undefined;
  return feature.values[tier];
}
