'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { designKeys } from '@/hooks/use-designs';
import { updateDesign, uploadLogo, uploadStripBackground } from '@/api';
import { CollapsibleSection } from '@/components/design/CollapsibleSection';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { BrandingForm } from '@/components/design/forms/BrandingForm';
import { StampsForm } from '@/components/design/forms/StampsForm';
import { PointsForm } from '@/components/design/forms/PointsForm';
import { ContentForm } from '@/components/design/forms/ContentForm';
import { BackForm } from '@/components/design/forms/BackForm';
import { useWizardStep } from '@/components/onboarding/wizard-context';
import { useDesignStepState } from '@/components/onboarding/chapters/design/useDesignStepState';
import { DesignPreviewPane } from '@/components/onboarding/chapters/design/DesignPreviewPane';
import { pruneEmptyLabelFields } from '@/components/onboarding/chapters/design/pruneDesignFields';
import type { CardDesign, LoyaltyProgram } from '@/types';
import { useConvertWizard } from '../convert-context';
import { buildTargetConfig, type TargetProgramDraft } from '../assemble';

type SectionKey = 'branding' | 'visual' | 'content' | 'back';

interface ConvertDesignEditorProps {
  design: CardDesign;
  targetDraft: TargetProgramDraft;
  /** Strip render state from the parent's useDesignReady (stamp targets). */
  stripsReady: boolean;
}

/**
 * The conversion wizard's card editor — the onboarding design chapter's four
 * sub-steps (branding, stamps/points visuals, content, back) folded into ONE
 * step as collapsible sections, sharing a single form state and one save on
 * Continue. Reuses the onboarding preview pane: fixed card on desktop,
 * "Preview card" footer action + bottom sheet on mobile.
 *
 * Two deliberate differences from onboarding:
 *  - everything previews/saves against the TARGET program shape (the live
 *    program still has the old type mid-wizard) via `programOverride`;
 *  - NO business-settings writes — the dashboard theme is set once during
 *    onboarding and a conversion never touches it.
 */
export function ConvertDesignEditor({
  design,
  targetDraft,
  stripsReady,
}: ConvertDesignEditorProps) {
  const tSteps = useTranslations('onboardingBusiness.chapters.design.steps');
  const tErr = useTranslations('conversion.errors');
  const ctx = useWizardStep();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { program, toType } = useConvertWizard();

  // The target program shape: live program identity, drafted type + config.
  // Everything downstream (form defaults, card_type reconcile, preview card)
  // reads this instead of the live program.
  const targetProgram = useMemo<LoyaltyProgram>(
    () =>
      ({
        ...program,
        type: toType,
        config: buildTargetConfig(targetDraft),
        reward_name:
          toType === 'stamp'
            ? targetDraft.rewardName || null
            : targetDraft.pointsRewards[0]?.name ?? null,
      }) as unknown as LoyaltyProgram,
    [program, toType, targetDraft]
  );

  const {
    formData,
    pendingLogoFile,
    setPendingLogoFile,
    pendingStripFile,
    setPendingStripFile,
    designContext,
  } = useDesignStepState(design, 'branding', { programOverride: targetProgram });

  // Field variables ({{...}}) must offer the TARGET type's set.
  const editorContext = {
    ...designContext,
    variableContext: {
      type: toType,
      rewardCount: toType === 'points' ? Math.max(1, targetDraft.pointsRewards.length) : 1,
    },
  };

  const [openSection, setOpenSection] = useState<SectionKey | null>('branding');
  const toggle = (key: SectionKey) =>
    setOpenSection((current) => (current === key ? null : key));

  // Continue needs a description (the wallet pass requires something under
  // the logo — same rule as onboarding's Branding step) and, for stamp
  // targets, the strip PNGs from the creation-time pre-render.
  const needsStrips = toType === 'stamp';
  const hasDescription = !!(formData.description ?? '').trim();
  const canProceed = hasDescription && (!needsStrips || stripsReady);
  useEffect(() => {
    ctx.setCanProceed(canProceed);
  }, [ctx, canProceed]);

  // One save for all four sections, on Continue.
  useEffect(() => {
    ctx.setSubmitHandler(async () => {
      if (!businessId) return { ok: false };
      try {
        const { translations, ...rest } = formData;
        void translations;
        const cleaned = pruneEmptyLabelFields({
          ...rest,
          card_type: toType,
          name: rest.name?.trim() || design.name || currentBusiness?.name || '',
          organization_name: rest.organization_name?.trim() ?? '',
          description: rest.description?.trim() ?? '',
        });
        if (cleaned.logo_url?.startsWith('blob:')) delete cleaned.logo_url;
        if (cleaned.strip_background_url?.startsWith('blob:')) {
          delete cleaned.strip_background_url;
        }

        const syncCache = (row: CardDesign) => {
          queryClient.setQueryData<CardDesign[]>(designKeys.all(businessId), (prev) => {
            if (!prev) return [row];
            return prev.map((d) => (d.id === design.id ? row : d));
          });
        };

        // Default regenerate-strips behaviour: stamp icon/color edits queue a
        // fresh strip render here, and the execute step's DESIGN_NOT_READY
        // guard covers the (rare) case where it hasn't settled by confirm.
        const updated = await updateDesign(businessId, design.id, cleaned);
        syncCache(updated);

        if (pendingLogoFile) {
          const result = await uploadLogo(businessId, design.id, pendingLogoFile);
          const withLogo = await updateDesign(
            businessId,
            design.id,
            { logo_url: result.url },
            { regenerateStrips: false }
          );
          syncCache(withLogo);
          setPendingLogoFile(null);
        }

        if (pendingStripFile) {
          const result = await uploadStripBackground(businessId, design.id, pendingStripFile);
          const withStrip = await updateDesign(businessId, design.id, {
            strip_background_url: result.url,
          });
          syncCache(withStrip);
          setPendingStripFile(null);
        }

        queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('generic'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [
    businessId, formData, pendingLogoFile, pendingStripFile, design.id, design.name,
    currentBusiness?.name, toType, queryClient, setPendingLogoFile, setPendingStripFile,
    ctx, tErr,
  ]);

  const sections: Array<{
    key: SectionKey;
    title: string;
    subtitle: string;
    content: React.ReactNode;
  }> = [
    {
      key: 'branding',
      title: tSteps('branding.title'),
      subtitle: tSteps('branding.subtitle'),
      content: <BrandingForm />,
    },
    {
      key: 'visual',
      title: toType === 'points' ? tSteps('points.title') : tSteps('stamps.title'),
      subtitle: toType === 'points' ? tSteps('points.subtitle') : tSteps('stamps.subtitle'),
      content:
        toType === 'points' ? (
          <PointsForm rewards={targetDraft.pointsRewards} />
        ) : (
          <StampsForm />
        ),
    },
    {
      key: 'content',
      title: tSteps('content.title'),
      subtitle: tSteps('content.subtitle'),
      content: <ContentForm />,
    },
    {
      key: 'back',
      title: tSteps('back.title'),
      subtitle: tSteps('back.subtitle'),
      content: (
        <BackForm
          hideSettingsLink
          hideTopDescription
          copy={{
            sharedSectionTitle: tSteps('back.sharedSectionTitle'),
            sharedSectionHelper: tSteps('back.sharedSectionHelper'),
            specificSectionTitle: tSteps('back.specificSectionTitle'),
            specificSectionHelper: tSteps('back.specificSectionHelper'),
            specificEmpty: tSteps('back.specificEmpty'),
            addFieldCta: tSteps('back.addFieldCta'),
          }}
        />
      ),
    },
  ];

  return (
    <DesignFormProvider value={editorContext}>
      <div className="flex flex-col gap-6 min-[1024px]:flex-row min-[1024px]:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {sections.map((section) => (
            <CollapsibleSection
              key={section.key}
              title={section.title}
              subtitle={section.subtitle}
              isOpen={openSection === section.key}
              onToggle={() => toggle(section.key)}
            >
              {section.content}
            </CollapsibleSection>
          ))}
        </div>
        <DesignPreviewPane
          programOverride={targetProgram}
          showAutoGenerate={openSection === 'branding' || openSection === 'visual'}
          showBack={openSection === 'back'}
        />
      </div>
    </DesignFormProvider>
  );
}
