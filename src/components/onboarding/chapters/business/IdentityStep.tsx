'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Spinner, X } from '@phosphor-icons/react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CountrySelect } from '@/components/ui/country-select';
import { ImageUploader } from '@/components/design';
import { useWizardStep, useWizardDraft } from '../../wizard-context';
import { useBusiness } from '@/contexts/business-context';
import { useAuth } from '@/contexts/auth-provider';
import {
  checkSlugAvailability,
  createBusiness,
  updateBusiness,
  uploadBusinessLogo,
} from '@/api/businesses';
import { detectDefaultCountry, countryToLocale } from '@/lib/countries';
import { cn } from '@/lib/utils';
import type { SetupProgress } from '@/types/business';

const SLUG_VALID_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const SLUG_AVAILABILITY_DEBOUNCE_MS = 400;
const SLUG_MIN_LENGTH = 3;

type SlugStatus =
  | 'idle'
  | 'tooShort'
  | 'invalid'
  | 'checking'
  | 'available'
  | 'taken';

/**
 * Normalise a typed slug value, applied on every keystroke. Same rules as the
 * `name → slug` auto-derivation: lowercase, strip accents, drop disallowed
 * characters, replace whitespace runs with single dashes, collapse repeated
 * dashes, and refuse a leading dash (so the user can keep typing).
 */
function slugifyLive(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '');
}

/** Trimming variant used when deriving the initial slug from the business name. */
function slugify(input: string): string {
  return slugifyLive(input).replace(/-+$/, '');
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
  // "confirm + commit" — no new business is created. Drafts override the
  // API-backed values so navigating Back→Forward keeps the typed input.
  const editingExisting = !!currentBusiness;
  const [name, setName] = useWizardDraft('identity.name', () => currentBusiness?.name ?? '');
  const [slug, setSlug] = useWizardDraft('identity.slug', () => currentBusiness?.url_slug ?? '');
  const [website, setWebsite] = useWizardDraft(
    'identity.website',
    () =>
      (currentBusiness?.settings?.identity_website as string | undefined) ?? ''
  );
  // Country the business operates from. Pre-filled from a best-effort guess
  // (timezone → browser region → language) so the field is never empty; the
  // owner can change it. Drafts persist it across Back→Forward like the others.
  const [country, setCountry] = useWizardDraft(
    'identity.country',
    () => currentBusiness?.country ?? detectDefaultCountry(uiLocale)
  );
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    () => currentBusiness?.logo_url ?? null
  );

  const handleLogoUpload = async (file: File) => {
    setPendingLogoFile(file);
    if (logoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const handleLogoClear = () => {
    setPendingLogoFile(null);
    if (logoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);
  };

  // Name → slug is sticky: every keystroke on the name re-derives the slug.
  // The owner can still hand-edit the slug, but the next name keystroke wins
  // — keeps the two fields visibly in sync when the owner is iterating on the
  // brand name. Existing businesses can't edit the slug at all (readOnly).
  const handleNameChange = (next: string) => {
    setName(next);
    if (!editingExisting) setSlug(slugify(next));
  };

  const handleSlugChange = (next: string) => {
    // Same slugify rules the name→slug derivation uses, so spaces and
    // special chars become dashes live instead of being dropped silently.
    setSlug(slugifyLive(next));
  };

  const isNameValid = name.trim().length > 0;
  const isSlugFormatValid = slug.length === 0 || SLUG_VALID_RE.test(slug);
  const isSlugLongEnough = slug.length >= SLUG_MIN_LENGTH;
  const isSlugValid = isSlugLongEnough && slug.length <= 50 && SLUG_VALID_RE.test(slug);

  // ── Live slug availability check ─────────────────────────────────────
  // Debounced ping to /businesses/slug/{slug}/available. Owners updating an
  // existing business don't see this (slug is read-only). The hint underneath
  // the input flips between "available" / "taken" / "checking" / format-error
  // so the owner gets feedback before they reach the submit handler.
  //
  // The server result is stored against the slug it was checked for, so we
  // can derive status from a single source of truth: if the current slug
  // matches the cached result, we trust it; otherwise we treat it as
  // "checking" until the next response lands. The effect's only job is
  // firing the API call.
  const [serverCheck, setServerCheck] = useState<{
    slug: string;
    available: boolean;
    reason: string | null;
  } | null>(null);
  const slugCheckIdRef = useRef(0);

  const needsServerCheck =
    !editingExisting &&
    slug.length > 0 &&
    isSlugValid &&
    (serverCheck === null || serverCheck.slug !== slug);

  useEffect(() => {
    if (!needsServerCheck) return;
    const myCheckId = ++slugCheckIdRef.current;
    const handle = window.setTimeout(async () => {
      try {
        const result = await checkSlugAvailability(slug);
        // Drop the result if a newer keystroke has already kicked off another
        // request — prevents flickering between stale and fresh values.
        if (slugCheckIdRef.current !== myCheckId) return;
        setServerCheck({
          slug,
          available: result.available,
          reason: result.reason ?? null,
        });
      } catch {
        // Network errors leave the indicator silent; submit-time check still runs.
      }
    }, SLUG_AVAILABILITY_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [needsServerCheck, slug]);

  const slugStatus: SlugStatus = (() => {
    if (editingExisting || slug.length === 0) return 'idle';
    if (!isSlugFormatValid) return 'invalid';
    if (!isSlugLongEnough) return 'tooShort';
    if (serverCheck && serverCheck.slug === slug) {
      return serverCheck.available ? 'available' : 'taken';
    }
    return 'checking';
  })();

  const slugReason =
    slugStatus === 'taken' && serverCheck && serverCheck.slug === slug
      ? serverCheck.reason
      : null;

  // Mute the footer's Continue button until validation passes. For new
  // businesses we also require the slug check to come back positive — the
  // submit handler will re-validate, but the disabled CTA prevents the
  // "tap → toast" round-trip.
  const canProceed =
    isNameValid &&
    (editingExisting || (isSlugValid && slugStatus === 'available'));

  useEffect(() => {
    ctx.setCanProceed(canProceed);
  }, [ctx, canProceed]);

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setSubmitHandler(async () => {
      if (!isNameValid) {
        toast.error(tErr('nameRequired'));
        return { ok: false };
      }
      if (!editingExisting) {
        if (!isSlugFormatValid) {
          toast.error(tErr('slugInvalid'));
          return { ok: false };
        }
        if (!isSlugLongEnough) {
          toast.error(tErr('slugTooShort'));
          return { ok: false };
        }
        if (!isSlugValid) {
          toast.error(tErr('slugInvalid'));
          return { ok: false };
        }
        if (slugStatus === 'taken') {
          toast.error(tErr('slugTaken'));
          return { ok: false };
        }
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
          // Diff-only update — backend shallow-merges, so other settings
          // keys (e.g. customer_data_collection from a returning user
          // session) stay intact instead of being clobbered by a stale
          // `currentBusiness.settings` spread.
          business = await updateBusiness(currentBusiness.id, {
            name: name.trim(),
            country,
            // The business's customer-facing language follows the country it
            // operates from (fr/es, else en). No-op on the backend when it
            // already matches; an actual change losslessly migrates existing
            // card/notification content to the new primary locale.
            primary_locale: countryToLocale(country),
            settings: {
              setup_progress: initialProgress,
              ...(websiteUrl ? { identity_website: websiteUrl } : {}),
            },
          });
        } else {
          business = await createBusiness({
            name: name.trim(),
            url_slug: slug,
            // Default new wizards to Growth so abandoned signups don't end
            // up sitting on Pro and skewing tier-mix stats. The plan step
            // still lets the owner upgrade or downgrade before finishing.
            subscription_tier: 'growth',
            settings: {},
            // Customer-facing language defaults to the language of the selected
            // country (fr/es, else en), not the dashboard UI locale.
            primary_locale: countryToLocale(country),
            country,
            // Opt every new signup into founding-partner pricing. The
            // backend gates the flag on `is_founding_program_open()` so
            // requests after the cutoff are silently coerced to false —
            // sending `true` here is the same as "FP if the program is
            // still open." Without this, new businesses created via the
            // wizard never get the flag set even during the open window,
            // and the plan step shows standard pricing for everyone.
            is_founding_partner: true,
          });
          // Stash the typed website in settings.identity_website so the
          // Card-back chapter can pre-fill it. We don't write business_info
          // here — InfoStep treats `business_info === undefined` as "not
          // seeded yet" and builds defaults from this stash + auth user.
          await updateBusiness(business.id, {
            settings: {
              ...(business.settings ?? {}),
              setup_progress: initialProgress,
              ...(websiteUrl ? { identity_website: websiteUrl } : {}),
            },
          });
        }

        if (pendingLogoFile) {
          try {
            const { url } = await uploadBusinessLogo(business.id, pendingLogoFile);
            business = { ...business, logo_url: url };
            setPendingLogoFile(null);
          } catch (err) {
            // Logo upload failure is non-fatal — the owner can retry from
            // settings later. Surface a toast but let the step complete.
            toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
          }
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
    country,
    pendingLogoFile,
    editingExisting,
    isNameValid,
    isSlugLongEnough,
    isSlugFormatValid,
    isSlugValid,
    slugStatus,
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
      <header className="flex flex-col gap-1 animate-slide-up">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col gap-5 animate-slide-up delay-80">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-3">
            <Label htmlFor="biz-name" className="wiz-body-sm font-medium">
              {t('fields.name')}
              <span aria-hidden="true" className="ml-0.5 text-[var(--accent)]">*</span>
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
        </div>

        <ImageUploader
          label={t('fields.logo')}
          value={logoPreviewUrl ?? undefined}
          onUpload={handleLogoUpload}
          onClear={logoPreviewUrl ? handleLogoClear : undefined}
          accept="image/*"
          hint={t('fields.logoHelp')}
          enableCrop
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-3">
            <Label htmlFor="biz-website" className="wiz-body-sm font-medium">
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
          <p className="wiz-micro text-[#999]">{t('fields.websiteHelp')}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-3">
            <Label htmlFor="biz-country" className="wiz-body-sm font-medium">
              {t('fields.country')}
            </Label>
            <CountrySelect
              id="biz-country"
              value={country}
              onChange={setCountry}
              label={t('fields.country')}
              className="h-11"
            />
          </div>
          <p className="wiz-micro text-[#999]">{t('fields.countryHelp')}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-3">
            <Label htmlFor="biz-slug" className="wiz-body-sm font-medium">
              {t('fields.slug')}
              {!editingExisting && (
                <span aria-hidden="true" className="ml-0.5 text-[var(--accent)]">*</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="biz-slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder={t('fields.slugPlaceholder')}
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                readOnly={editingExisting}
                disabled={editingExisting}
                aria-invalid={slugStatus === 'taken' || slugStatus === 'invalid'}
                className={cn(
                  'h-11 pr-10 transition-colors',
                  slugStatus === 'available' && 'border-green-500 focus-visible:border-green-500',
                  (slugStatus === 'taken' || slugStatus === 'invalid') &&
                  'border-red-500 focus-visible:border-red-500'
                )}
              />
              <SlugStatusIcon status={slugStatus} />
            </div>
          </div>
          <SlugStatusHint
            status={slugStatus}
            slugPreview={slugPreview}
            reason={slugReason}
            t={t}
            tErr={tErr}
          />
        </div>
      </div>
    </div>
  );
}

function SlugStatusIcon({ status }: { status: SlugStatus }) {
  // tooShort/idle/invalid don't render an icon — the helper text already
  // conveys the state, and an icon would feel alarmist while the user is
  // still typing.
  if (status !== 'checking' && status !== 'available' && status !== 'taken') {
    return null;
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
    >
      {status === 'checking' && (
        <Spinner className="w-4 h-4 text-[#999] animate-spin" weight="bold" />
      )}
      {status === 'available' && (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white animate-in zoom-in-50 duration-200">
          <Check className="w-3 h-3" weight="bold" />
        </span>
      )}
      {status === 'taken' && (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white animate-in zoom-in-50 duration-200">
          <X className="w-3 h-3" weight="bold" />
        </span>
      )}
    </div>
  );
}

interface SlugStatusHintProps {
  status: SlugStatus;
  slugPreview: string;
  reason: string | null;
  t: ReturnType<typeof useTranslations>;
  tErr: ReturnType<typeof useTranslations>;
}

function SlugStatusHint({ status, slugPreview, reason, t, tErr }: SlugStatusHintProps) {
  if (status === 'taken') {
    return (
      <p className="wiz-micro text-red-600 font-medium">
        {reason ?? tErr('slugTaken')}
      </p>
    );
  }
  if (status === 'invalid') {
    return <p className="wiz-micro text-red-600 font-medium">{tErr('slugInvalid')}</p>;
  }
  if (status === 'tooShort') {
    // Calm grey copy — the user is still typing, no alarm needed.
    return <p className="wiz-micro text-[#999]">{tErr('slugTooShort')}</p>;
  }
  if (status === 'checking') {
    return <p className="wiz-micro text-[#999]">{t('fields.slugChecking')}</p>;
  }
  if (status === 'available') {
    return (
      <p className="wiz-micro text-green-600 font-medium">
        {t('fields.slugAvailable')} — {t('fields.slugHelp', { slug: slugPreview })}
      </p>
    );
  }
  return <p className="wiz-micro text-[#999]">{t('fields.slugHelp', { slug: slugPreview })}</p>;
}
