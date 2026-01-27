'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { CardDesign } from '@/types';
import { getDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import DesignEditor from '@/components/design/DesignEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function EditDesignPage() {
  const params = useParams();
  const designId = params.id as string;
  const { currentBusiness } = useBusiness();

  const [design, setDesign] = useState<CardDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDesign() {
      if (!currentBusiness?.id) return;
      try {
        const data = await getDesign(currentBusiness.id, designId);
        setDesign(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load design');
      } finally {
        setLoading(false);
      }
    }

    loadDesign();
  }, [designId, currentBusiness?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="space-y-6">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
          {error || 'Design not found'}
        </div>
        <Button variant="outline" asChild>
          <Link href="/design">Back to Designs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/design">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold">{design.name}</h2>
            <p className="text-muted-foreground">Edit design</p>
          </div>
          {design.is_active && (
            <Badge variant="default">Active</Badge>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <DesignEditor design={design} />
      </div>
    </div>
  );
}
