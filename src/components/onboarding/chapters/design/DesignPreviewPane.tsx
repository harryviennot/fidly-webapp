'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CaretDown, Eye } from '@phosphor-icons/react';
import { EditorCard } from '@/components/card/EditorCard';
import { useBusiness } from '@/contexts/business-context';
import { useDefaultProgram } from '@/hooks/use-programs';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDesignForm } from '@/components/design/forms/DesignFormContext';
import { cn } from '@/lib/utils';

interface DesignPreviewPaneProps {
  /** Render the back of the card. Default: front. */
  showBack?: boolean;
}

/**
 * Side-by-side preview for design wizard sub-steps. Reads from the
 * `DesignFormContext` so the same component renders across Branding /
 * Stamps / Content / Back.
 *
 * Responsive layout:
 *  - ≥1024px: sticky pinned to the right of the form.
 *  - 768–1023px: above the form, single column, non-sticky.
 *  - <768px: collapsible strip at the top — tap to expand, tap to collapse.
 */
export function DesignPreviewPane({ showBack = false }: DesignPreviewPaneProps) {
  const t = useTranslations('designEditor.preview');
  const { currentBusiness } = useBusiness();
  const isMobile = useIsMobile();
  const { formData } = useDesignForm();
  const { data: program } = useDefaultProgram(currentBusiness?.id);

  const [expanded, setExpanded] = useState(false);

  const totalStamps = program?.config?.total_stamps;
  const organizationName = currentBusiness?.name;
  const previewStamps = totalStamps ? Math.max(1, Math.floor(totalStamps * 0.3)) : 3;

  if (isMobile) {
    return (
      <div
        className={cn(
          'sticky top-0 z-10 -mx-4 px-4 py-3 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--border-light)] transition-all'
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <span className="inline-flex items-center gap-2 wiz-helper font-semibold text-[var(--foreground)]">
            <Eye className="w-4 h-4 text-[#888]" weight="bold" />
            {t('preview')}
          </span>
          <CaretDown
            className={cn(
              'w-3.5 h-3.5 text-[#888] transition-transform',
              expanded && 'rotate-180'
            )}
            weight="bold"
          />
        </button>
        {expanded && (
          <div className="flex items-center justify-center pt-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <EditorCard
              design={formData}
              previewStamps={previewStamps}
              totalStamps={totalStamps}
              organizationName={organizationName}
              showBack={showBack}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="hidden min-[768px]:flex flex-col items-center w-full min-[1024px]:w-[420px] min-[1024px]:flex-shrink-0 min-[1024px]:sticky min-[1024px]:top-24">
      <EditorCard
        design={formData}
        previewStamps={previewStamps}
        totalStamps={totalStamps}
        organizationName={organizationName}
        showBack={showBack}
      />
    </aside>
  );
}
