'use client';

import DesignEditor from '@/components/design/DesignEditor';

export default function NewDesignPage() {
  return (
    <div className="bg-white rounded-lg border p-6">
      <DesignEditor isNew />
    </div>
  );
}
