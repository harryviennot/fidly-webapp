'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
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
import { AutoGenerateBar } from '@/components/design/AutoGenerateBar';

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
  const asideRef = useRef<HTMLDivElement>(null);
  // Horizontal centerline of the aside column in viewport coordinates.
  // The inner card uses `position: fixed` (truly anchored to the viewport,
  // not just sticky within the aside), so we measure where the reserved
  // column lives and pin the card there. `null` while pre-measure → card
  // is hidden via opacity to avoid a paint at the wrong spot.
  const [centerX, setCenterX] = useState<number | null>(null);

  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    const update = () => {
      const rect = aside.getBoundingClientRect();
      setCenterX(rect.left + rect.width / 2);
    };
    update();
    // `document.body` resize covers viewport width changes + layout shifts
    // (sidebar collapse, font load, etc.) without needing scroll listeners —
    // `fixed` positioning ignores scroll, so left/x only moves on layout
    // changes, never on scroll.
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <aside ref={asideRef} className="w-[480px] flex-shrink-0">
      <div
        className="fixed top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity"
        style={{
          left: centerX ?? 0,
          opacity: centerX === null ? 0 : 1,
        }}
      >
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

  // Register the trigger as the wizard footer's secondary action so it sits
  // beside Continue with consistent styling. The shell clears the action on
  // step change, but we also return a cleanup for unmount safety.
  useEffect(() => {
    ctx.setSecondaryAction({
      label: t('preview'),
      icon: <CreditCardIcon className="w-4 h-4" weight="bold" />,
      onClick: () => setOpen(true),
    });
    return () => ctx.setSecondaryAction(null);
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
        <div className="px-4 pb-3">
          <AutoGenerateBar />
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-8 overflow-y-auto">
          <div className="w-full max-w-[380px]">
            <EditorCard {...cardProps} showBack={showBack} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
