'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCardIcon } from '@phosphor-icons/react';
import { EditorCard } from '@/components/card/EditorCard';
import { useBusiness } from '@/contexts/business-context';
import { useDefaultProgram } from '@/hooks/use-programs';
import { useDesignForm } from '@/components/design/forms/DesignFormContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useWizardStep } from '../../wizard-context';

const LARGE_SCREEN_QUERY = '(min-width: 1024px)';

/**
 * Render the desktop preview at ≥1024px; below that, the mobile sheet
 * trigger takes over. Picking the breakpoint matches the wizard form's
 * widest column where the side-by-side layout actually fits.
 *
 * Uses `useSyncExternalStore` so the subscription is set up without a
 * setState-in-effect (which the lint rule blocks) and SSR/CSR markup
 * matches before the first client tick.
 */
function useIsLargeScreen(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(LARGE_SCREEN_QUERY);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    () => window.matchMedia(LARGE_SCREEN_QUERY).matches,
    () => false
  );
}

interface DesignPreviewPaneProps {
  /** Render the back of the card. Default: front. */
  showBack?: boolean;
}

/**
 * Card preview for the design chapter. Reads from `DesignFormContext` so
 * it stays in sync with edits in any of the four design sub-steps.
 *
 *  - **Desktop (≥1024px)**: sticky aside on the RIGHT side of the form,
 *    capped at ~320px wide so the form keeps room to breathe.
 *  - **Mobile (<1024px)**: a sticky "Preview card" button anchored near
 *    the bottom of the viewport (above the wizard footer). Tap to open a
 *    bottom sheet with the card; tap the close X or the backdrop to
 *    collapse it.
 *
 * `showBack` flips the card to its back view — `BackStep` passes `true`,
 * the other sub-steps default to the front.
 */
export function DesignPreviewPane({ showBack = false }: DesignPreviewPaneProps) {
  const isLarge = useIsLargeScreen();
  // Single source of truth tied to the same 1024px breakpoint where the
  // form column has room for a side-by-side card. Avoids the previous
  // dead zone at 768–1023px where neither preview surface was rendered.
  if (isLarge) return <DesktopPreview showBack={showBack} />;
  return <MobilePreview showBack={showBack} />;
}

function useCardProps() {
  const { currentBusiness } = useBusiness();
  const { formData } = useDesignForm();
  const { data: program } = useDefaultProgram(currentBusiness?.id);
  const totalStamps = program?.config?.total_stamps;
  const previewStamps = totalStamps
    ? Math.max(1, Math.floor(totalStamps * 0.3))
    : 3;
  return {
    design: formData,
    totalStamps,
    previewStamps,
    organizationName: currentBusiness?.name,
  };
}

function DesktopPreview({ showBack }: { showBack: boolean }) {
  const cardProps = useCardProps();
  return (
    // Outer aside reserves the column width in the flex layout and stretches
    // to the form column's height (requires the parent to drop `items-start`
    // so flex defaults to stretch). The inner div is sticky-centered at
    // viewport mid-height, so the card stays in view no matter how deep the
    // user is in the form.
    <aside className="w-[320px] flex-shrink-0 self-stretch">
      <div className="sticky top-1/2 -translate-y-1/2 flex justify-center">
        <EditorCard {...cardProps} showBack={showBack} />
      </div>
    </aside>
  );
}

function MobilePreview({ showBack }: { showBack: boolean }) {
  const t = useTranslations('designEditor.preview');
  const ctx = useWizardStep();
  const cardProps = useCardProps();
  const [open, setOpen] = useState(false);

  // The trigger is mounted as an *extension row* of the wizard footer so
  // it sits naturally above the Back / Continue row — no fragile sticky
  // positioning. The Sheet itself stays portalled to <body> by Radix so
  // it covers the whole viewport.
  useEffect(() => {
    ctx.setFooterExtra(
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 py-2 wiz-body-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
      >
        <CreditCardIcon className="w-4 h-4" weight="bold" />
        {t('preview')}
      </button>
    );
    return () => ctx.setFooterExtra(null);
  }, [ctx, t]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="h-[80vh] rounded-t-2xl flex flex-col gap-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="wiz-h2 font-semibold">
            {t('preview')}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex items-center justify-center px-6 pb-8 overflow-y-auto">
          <div className="w-full max-w-[320px]">
            <EditorCard {...cardProps} showBack={showBack} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
