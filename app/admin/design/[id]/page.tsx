'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CardDesign } from '@/lib/types';
import { getDesign } from '@/lib/api';
import DesignEditor from '@/components/design/DesignEditor';

export default function EditDesignPage() {
  const params = useParams();
  const designId = params.id as string;

  const [design, setDesign] = useState<CardDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDesign() {
      try {
        const data = await getDesign(designId);
        setDesign(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load design');
      } finally {
        setLoading(false);
      }
    }

    loadDesign();
  }, [designId]);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-card">
          <div className="loading-state">Loading design...</div>
        </div>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="admin-container">
        <div className="admin-card">
          <div className="error-message">{error || 'Design not found'}</div>
          <Link href="/admin/design" className="btn btn-secondary" style={{ marginTop: '16px' }}>
            Back to Designs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container design-editor-container">
      <div className="admin-card">
        <div className="design-page-header">
          <div className="design-page-title">
            <Link href="/admin/design" className="back-link">Back to Designs</Link>
            <h1>Edit: {design.name}</h1>
            {design.is_active && <span className="active-badge">Active</span>}
          </div>
        </div>

        <DesignEditor design={design} />
      </div>
    </div>
  );
}
