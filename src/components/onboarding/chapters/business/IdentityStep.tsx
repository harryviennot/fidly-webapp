'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWizardStep } from '../../wizard-context';
import { useBusiness } from '@/contexts/business-context';
import { useAuth } from '@/contexts/auth-provider';
import { createBusiness, updateBusiness } from '@/api/businesses';
import { detectBusinessLocale } from '@/lib/locale-detect';
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
  const { currentBusiness, setCurrentBusiness, refetch } = useBusiness();
  const queryClient = useQueryClient();
  const ctx = useWizardStep();
  const uiLocale = useLocale();

  // Pre-fill from currentBusiness when present (e.g. business was created on
  // showcase before this wizard ran). In that case Identity becomes
  // "confirm + commit" — no new business is created.
  const [name, setName] = useState(() => currentBusiness?.name ?? '');
  const [slug, setSlug] = useState(() => currentBusiness?.url_slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!currentBusiness?.url_slug);
  const [website, setWebsite] = useState('');

  // Keep the slug synced with the business name until the user edits the slug
  // directly. We update both in the same event handler (no useEffect) so the
  // render stays single-pass.
  const handleNameChange = (next: string) => {
    setName(next);
    if (!slugTouched) setSlug(slugify(next));
  };

  const handleSlugChange = (next: string) => {
    setSlug(next.toLowerCase().replace(SLUG_INPUT_RE, ''));
    setSlugTouched(true);
  };

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

        // Stash for Backfields to pre-fill. Sourced from whatever the owner
        // typed in the form; if blank, also fall back to whatever value the
        // business already has (showcase may have set it earlier).
        const websiteUrl =
          website.trim() ||
          (currentBusiness?.settings?.identity_website as string | undefined) ||
          '';

        let business;
        if (currentBusiness) {
          // Existing business (showcase or prior wizard run) — update name +
          // setup_progress + identity_website. Slug isn't mutable post-
          // creation; the form pre-fills it but we don't try to change it.
          business = await updateBusiness(currentBusiness.id, {
            name: name.trim(),
            settings: {
              ...(currentBusiness.settings ?? {}),
              setup_progress: initialProgress,
              ...(websiteUrl ? { identity_website: websiteUrl } : {}),
            },
          });
        } else {
          business = await createBusiness({
            name: name.trim(),
            url_slug: slug,
            subscription_tier: 'pro',
            settings: {},
            website: websiteUrl || undefined,
            primary_locale: detectBusinessLocale(uiLocale),
          });
          // Stash the typed website in settings.identity_website so the
          // Backfields chapter can pre-fill it. We don't write business_info
          // here — Backfields treats `business_info === undefined` as "not
          // seeded yet" and builds defaults from this stash + auth user.
          await updateBusiness(business.id, {
            settings: {
              ...(business.settings ?? {}),
              setup_progress: initialProgress,
              ...(websiteUrl ? { identity_website: websiteUrl } : {}),
            },
          });
        }

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
    currentBusiness,
    refetch,
    setCurrentBusiness,
    queryClient,
    user?.id,
    tErr,
    uiLocale,
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
            onChange={(e) => handleNameChange(e.target.value)}
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
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder={t('fields.slugPlaceholder')}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            readOnly={!!currentBusiness}
            disabled={!!currentBusiness}
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
