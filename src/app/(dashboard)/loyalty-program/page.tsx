'use client';

import { useEffect, useState, useCallback } from 'react';
import { CardDesign } from '@/types';
import { getDesigns, deleteDesign, activateDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import { ActiveCardSection } from '@/components/loyalty-program/ActiveCardSection';
import { ProgramSettingsCard } from '@/components/loyalty-program/ProgramSettingsCard';
import { CardDesignsGrid } from '@/components/loyalty-program/CardDesignsGrid';

export default function LoyaltyProgramPage() {
  const { currentBusiness } = useBusiness();
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isProPlan = currentBusiness?.subscription_tier === 'pro';
  const activeDesign = designs.find((d) => d.is_active);
  const inactiveDesigns = designs.filter((d) => !d.is_active);

  const loadDesigns = useCallback(async () => {
    if (!currentBusiness?.id) return;
    try {
      const data = await getDesigns(currentBusiness.id);
      setDesigns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load designs');
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const handleDelete = async (designId: string) => {
    if (!currentBusiness?.id) return;
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      await deleteDesign(currentBusiness.id, designId);
      loadDesigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete design');
    }
  };

  const handleActivate = async (designId: string) => {
    if (!currentBusiness?.id) return;

    try {
      await activateDesign(currentBusiness.id, designId);
      loadDesigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate design');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Loyalty Program</h1>
        <p className="text-muted-foreground mt-1">
          Configure your loyalty program settings and card designs
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Main Content: Active Card + Settings Card with Tabs */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Active Card Preview (hidden on mobile) */}
        <div className="hidden lg:block w-72 shrink-0">
          <ActiveCardSection
            design={activeDesign}
            inactiveDesign={!isProPlan && !activeDesign ? inactiveDesigns[0] : undefined}
            onActivate={handleActivate}
            onDelete={handleDelete}
          />
        </div>

        {/* Right: Settings Card with Tabs */}
        <ProgramSettingsCard isProPlan={isProPlan} hasActiveCard={!!activeDesign} />
      </div>

      {/* Card Designs Section */}
      <CardDesignsGrid
        designs={inactiveDesigns}
        activeDesign={activeDesign}
        isProPlan={isProPlan}
        onDelete={handleDelete}
        onActivate={handleActivate}
        onRefresh={loadDesigns}
      />
    </div>
  );
}
