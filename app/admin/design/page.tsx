'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CardDesign } from '@/lib/types';
import { getDesigns, activateDesign, deleteDesign } from '@/lib/api';
import { DesignCard } from '@/components/design';

export default function DesignListPage() {
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const loadDesigns = async () => {
    try {
      const data = await getDesigns();
      setDesigns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load designs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDesigns();
  }, []);

  const handleActivate = async (id: string) => {
    if (!confirm('Activate this design? All existing customers will receive the updated card design.')) {
      return;
    }

    setActivatingId(id);
    try {
      await activateDesign(id);
      await loadDesigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to activate design');
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design? This cannot be undone.')) {
      return;
    }

    try {
      await deleteDesign(id);
      await loadDesigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete design');
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-card">
          <div className="loading-state">Loading designs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-card">
        <div className="design-page-header">
          <div className="design-page-title">
            <Link href="/admin" className="back-link">Back</Link>
            <h1>Card Designs</h1>
            <p className="subtitle">Create and manage your loyalty card designs</p>
          </div>
          <Link href="/admin/design/new" className="btn btn-primary">
            + New Design
          </Link>
        </div>

        {error && <div className="error-message">{error}</div>}

        {designs.length === 0 ? (
          <div className="empty-state">
            <p>No designs yet. Create your first loyalty card design!</p>
            <Link href="/admin/design/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Create Design
            </Link>
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
    </div>
  );
}
