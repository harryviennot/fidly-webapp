'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import DesignEditor from '@/components/design/DesignEditor';
import { Button } from '@/components/ui/button';

export default function NewDesignPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/design">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Create New Design</h2>
          <p className="text-muted-foreground">
            Design your loyalty card
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <DesignEditor isNew />
      </div>
    </div>
  );
}
