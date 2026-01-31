'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PlusIcon, Crown } from '@phosphor-icons/react';
import { CardDesign } from '@/types';
import { getDesigns, deleteDesign, activateDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import { DesignCard } from '@/components/design';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DesignListPage() {
  const { currentBusiness } = useBusiness();
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Plan-based limits
  const isBasePlan = currentBusiness?.subscription_tier === 'pay';
  const designLimit = isBasePlan ? 1 : Infinity;
  const canCreateNew = designs.length < designLimit;

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Card Designs</h2>
          {isBasePlan ? (
            <Badge variant="secondary" className="text-xs">
              {designs.length}/1 designs
            </Badge>
          ) : (
            <Badge variant="default" className="text-xs">
              <Crown className="w-3 h-3 mr-1" />
              Pro
            </Badge>
          )}
        </div>
        {canCreateNew ? (
          <Button asChild>
            <Link href="/design/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Design
            </Link>
          </Button>
        ) : (
          <Button disabled title="Upgrade to Pro to create multiple designs">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Design
          </Button>
        )}
      </div>

      {!canCreateNew && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Crown className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Design limit reached</p>
            <p className="text-sm text-amber-700">
              Upgrade to Pro to create multiple card designs for different campaigns.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
          {error}
        </div>
      )}

      {designs.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No designs yet. Create your first loyalty card design!
          </p>
          <Button asChild>
            <Link href="/design/new">Create Design</Link>
          </Button>
        </div>
      ) : (
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {[...designs].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0)).map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              onDelete={handleDelete}
              onActivate={handleActivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
