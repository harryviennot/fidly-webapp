'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PlusIcon } from '@phosphor-icons/react';
import { CardDesign } from '@/types';
import { getDesigns, activateDesign, deleteDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import { DesignCard } from '@/components/design';
import { Button } from '@/components/ui/button';

export default function DesignListPage() {
  const { currentBusiness } = useBusiness();
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

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

  const handleActivate = async (id: string) => {
    if (!currentBusiness?.id) return;
    if (!confirm('Activate this design? All existing customers will receive the updated card design.')) {
      return;
    }

    setActivatingId(id);
    try {
      await activateDesign(currentBusiness.id, id);
      await loadDesigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to activate design');
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentBusiness?.id) return;
    if (!confirm('Are you sure you want to delete this design? This cannot be undone.')) {
      return;
    }

    try {
      await deleteDesign(currentBusiness.id, id);
      await loadDesigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete design');
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
        <h2 className="text-2xl font-bold">Card Designs</h2>
        <Button asChild>
          <Link href="/design/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Design
          </Link>
        </Button>
      </div>

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
        <div className="design-grid">
          {designs.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              onActivate={handleActivate}
              onDelete={handleDelete}
              isActivating={activatingId === design.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
