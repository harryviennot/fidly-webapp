'use client';

import Link from 'next/link';
import { CardDesign } from '@/lib/types';

interface DesignCardProps {
  design: CardDesign;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  isActivating?: boolean;
}

export default function DesignCard({
  design,
  onActivate,
  onDelete,
  isActivating = false,
}: DesignCardProps) {
  return (
    <div className={`design-card ${design.is_active ? 'active' : ''}`}>
      {/* Mini preview */}
      <div
        className="design-card-preview"
        style={{ backgroundColor: design.background_color }}
      >
        <div className="preview-header" style={{ color: design.foreground_color }}>
          {design.logo_text || design.organization_name}
        </div>
        <div className="preview-stamps">
          {Array.from({ length: Math.min(design.total_stamps, 10) }).map((_, i) => (
            <span
              key={i}
              className="preview-stamp"
              style={{
                backgroundColor: i < 3 ? design.stamp_filled_color : design.stamp_empty_color,
                borderColor: design.stamp_border_color,
              }}
            />
          ))}
        </div>
      </div>

      {/* Card info */}
      <div className="design-card-info">
        <h3 className="design-card-name">
          {design.name}
          {design.is_active && <span className="active-badge">Active</span>}
        </h3>
        <p className="design-card-org">{design.organization_name}</p>
      </div>

      {/* Actions */}
      <div className="design-card-actions">
        <Link href={`/app/design/${design.id}`} className="btn btn-secondary btn-small">
          Edit
        </Link>
        {!design.is_active && (
          <>
            <button
              onClick={() => onActivate(design.id)}
              className="btn btn-primary btn-small"
              disabled={isActivating}
            >
              {isActivating ? 'Activating...' : 'Activate'}
            </button>
            <button
              onClick={() => onDelete(design.id)}
              className="btn btn-danger btn-small"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
