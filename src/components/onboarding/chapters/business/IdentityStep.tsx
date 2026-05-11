'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizardStep } from '../../wizard-context';
import { useBusiness } from '@/contexts/business-context';
import { useAuth } from '@/contexts/auth-provider';
import { createBusiness, updateBusiness } from '@/api/businesses';
import type { SetupProgress } from '@/types/business';

const SLUG_INPUT_RE = /[^a-z0-9-]/g;
const SLUG_VALID_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * First sub-step that creates a business row. Posts to /businesses with
 * subscription_tier='pro' so the wizard runs with full feature access during
 * the 30-day trial. Writes an initial setup_progress JSON marking welcome +
 * identity as completed in one round-trip — keeps the wizard's writes
 * idempotent on re-entry.
 */
export function IdentityStep() {
  const t = useTranslations('onboardingBusiness.chapters.business.steps.identity');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { user } = useAuth();
  const { setCurrentBusiness, refetch } = useBusiness();
  const queryClient = useQueryClient();
  const ctx = useWizardStep();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [website, setWebsite] = useState('');

  const derivedSlug = useMemo(() => slugify(name), [name]);
  useEffect(() => {
    if (!slugTouched) setSlug(derivedSlug);
  }, [derivedSlug, slugTouched]);

  const isNameValid = name.trim().length > 0;
  const isSlugValid = slug.length >= 3 && slug.length <= 50 && SLUG_VALID_RE.test(slug);

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setSubmitHandler(async () => {
      if (!isNameValid) {
        toast.error(tErr('nameRequired'));
        return { ok: false };
      }
      if (!isSlugValid) {
        toast.error(tErr('slugInvalid'));
        return { ok: false };
      }
      try {
        const business = await createBusiness({
          name: name.trim(),
          url_slug: slug,
          subscription_tier: 'pro',
          settings: {},
          website: website.trim() || undefined,
        });

        const initialProgress: SetupProgress = {
          started_at: new Date().toISOString(),
          completed_at: null,
          last_step: { chapter: 'business', step: 'identity' },
          completed: [
            { chapter: 'welcome', step: 'welcome' },
            { chapter: 'business', step: 'identity' },
          ],
          skipped: [],
          payload: {},
        };

        await updateBusiness(business.id, {
          settings: {
            ...(business.settings ?? {}),
            setup_progress: initialProgress,
          },
        });

        await refetch();
        setCurrentBusiness({
          ...business,
          settings: {
            ...(business.settings ?? {}),
            setup_progress: initialProgress,
          },
        });

        if (user?.id) {
          await queryClient.invalidateQueries({ queryKey: ['business', 'memberships', user.id] });
        }

        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : tErr('createFailed');
        // Surface slug-collision specifically when the backend says so.
        if (message.toLowerCase().includes('slug')) {
          toast.error(tErr('slugTaken'));
        } else {
          toast.error(message);
        }
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [
    name,
    slug,
    website,
    isNameValid,
    isSlugValid,
    ctx,
    refetch,
    setCurrentBusiness,
    queryClient,
    user?.id,
    tErr,
  ]);

  const slugPreview = slug || t('fields.slugPlaceholder');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="biz-name" className="text-[13px] font-medium">
            {t('fields.name')}
          </Label>
          <Input
            id="biz-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('fields.namePlaceholder')}
            autoComplete="organization"
            autoFocus
            className="h-11"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="biz-slug" className="text-[13px] font-medium">
            {t('fields.slug')}
          </Label>
          <Input
            id="biz-slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(SLUG_INPUT_RE, ''));
              setSlugTouched(true);
            }}
            placeholder={t('fields.slugPlaceholder')}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className="h-11"
          />
          <p className="text-[11.5px] text-[#999]">{t('fields.slugHelp', { slug: slugPreview })}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="biz-website" className="text-[13px] font-medium">
            {t('fields.website')}
          </Label>
          <Input
            id="biz-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={t('fields.websitePlaceholder')}
            inputMode="url"
            autoComplete="url"
            className="h-11"
          />
        </div>
      </div>
    </div>
  );
}
