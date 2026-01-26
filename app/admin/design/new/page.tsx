'use client';

import Link from 'next/link';
import DesignEditor from '@/components/design/DesignEditor';

export default function NewDesignPage() {
  return (
    <div className="admin-container design-editor-container">
      <div className="admin-card">
        <div className="design-page-header">
          <div className="design-page-title">
            <Link href="/admin/design" className="back-link">Back to Designs</Link>
            <h1>Create New Design</h1>
          </div>
        </div>

        <DesignEditor isNew />
      </div>
    </div>
  );
}
