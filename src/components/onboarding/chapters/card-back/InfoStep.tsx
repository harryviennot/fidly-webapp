'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/business-context';
import { useAuth } from '@/contexts/auth-provider';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { BusinessInfoEditor } from '@/components/settings/BusinessInfoEditor';
import { getMyProfile } from '@/api/profile';
import { useDirtySnapshot, useWizardStep } from '../../wizard-context';
import type { BusinessInfoEntry } from '@/types/business';
import type { User } from '@/types';

/**
 * Card-back info — optional. Sets up the business-level back-of-card info
 * (phone, website, address, hours, terms) once. These entries are inherited
 * by every card design; the Design → Back sub-step (Ch 6.4) later toggles
 * per-card visibility.
 *
 * Reuses the dashboard's `BusinessInfoEditor` so the experience matches
 * `/settings` — owners build muscle memory before they ever hit the
 * dashboard.
 *
 * Pre-fills sensible defaults from data we already collected:
 *   - owner email (from Supabase auth)
 *   - owner phone (from public.users.phone, sync'd from auth.users by trigger)
 *   - business website (written by IdentityStep when the owner typed one)
 *
 * Only seeds defaults when `settings.business_info` is still undefined
 * (first visit). After save the key exists — even an empty array — so we
 * don't re-seed entries the owner explicitly cleared.
 */
export function InfoStep() {
  const t = useTranslations('onboardingBusiness.chapters.card-back.steps.info');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { mutateAsync: updateBusiness } = useUpdateBusiness(currentBusiness?.id);
  const queryClient = useQueryClient();
  const ctx = useWizardStep();

  // Pull the DB-backed profile so we can read phone from public.users.phone
  // (synced from auth.users.raw_user_meta_data.phone by the trigger). Falling
  // back to user_metadata.phone covers freshly-signed-up sessions where the
  // refetch hasn't landed yet.
  const [profile, setProfile] = useState<User | null>(null);
  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => { /* leave null; fall back to user_metadata */ });
    return () => { cancelled = true; };
  }, []);

  const ownerEmail = user?.email ?? profile?.email ?? '';
  const ownerPhone =
    profile?.phone ?? (user?.user_metadata?.phone as string | undefined) ?? '';
  const identityWebsite =
    (currentBusiness?.settings?.identity_website as string | undefined) ?? '';

  const seedDefaults = useMemo<BusinessInfoEntry[] | null>(() => {
    if (!currentBusiness) return null;
    // Already initialised — even an empty array signals the owner has been here.
    if (currentBusiness.settings?.business_info !== undefined) return null;
    const defaults: BusinessInfoEntry[] = [];
    if (identityWebsite) {
      defaults.push({
        type: 'website',
        key: 'website-default',
        data: { url: identityWebsite },
      });
    }
    if (ownerEmail) {
      defaults.push({
        type: 'email',
        key: 'email-default',
        data: { email: ownerEmail },
      });
    }
    if (ownerPhone) {
      defaults.push({
        type: 'phone',
        key: 'phone-default',
        data: { number: ownerPhone },
      });
    }
    return defaults;
  }, [currentBusiness, identityWebsite, ownerEmail, ownerPhone]);

  const [edits, setEdits] = useState<BusinessInfoEntry[] | null>(null);

  const value: BusinessInfoEntry[] = useMemo(() => {
    if (edits !== null) return edits;
    const existing = currentBusiness?.settings?.business_info;
    if (existing !== undefined) return existing;
    return seedDefaults ?? [];
  }, [edits, currentBusiness, seedDefaults]);

  // Persist whatever's currently visible — explicit edits OR the seed
  // defaults (so they survive a "Continue" without editing). Setting the
  // key, even to [], blocks re-seeding on future visits.
  const toSave = useMemo<BusinessInfoEntry[]>(
    () => edits ?? currentBusiness?.settings?.business_info ?? seedDefaults ?? [],
    [edits, currentBusiness, seedDefaults]
  );
  const { isDirty, markSaved } = useDirtySnapshot('card-back.info', toSave);

  useEffect(() => {
    ctx.setCanSkip(true);
    ctx.setSubmitHandler(async () => {
      if (!currentBusiness) return { ok: false };
      if (!isDirty) return { ok: true };

      // Drop any entry the owner added but never filled in — otherwise empty
      // phone / email / blank hours rows would render as ghost lines on the
      // back of every pass.
      const snapshot = pruneEmptyEntries(toSave);
      // Synchronous save (no `save` callback). The design chapter's BackStep
      // depends on `currentBusiness.settings.business_info` being populated
      // when the user lands on it — a background save would race with
      // navigation and leave the back-fields list empty until the refetch
      // catches up. Worth the small extra wait on Next.
      try {
        // Diff-only update — backend shallow-merges into the stored
        // settings, so unrelated keys (e.g. customer_data_collection from
        // a prior step) stay intact even if our `currentBusiness` cache
        // is mid-refresh.
        await updateBusiness({
          settings: { business_info: snapshot },
        });
        // `useUpdateBusiness` calls `invalidateQueries` on success, but that
        // only schedules a background refetch. Await the refetch here so
        // `currentBusiness.settings.business_info` is fresh by the time the
        // user lands on the design BackStep — otherwise the saved entries
        // don't show up until the user manually reloads.
        await queryClient.refetchQueries({ queryKey: ['business'] });
        markSaved();
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [toSave, isDirty, markSaved, currentBusiness, updateBusiness, queryClient, ctx, tErr]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 animate-slide-up">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>
      <div className="animate-slide-up delay-80">
        <BusinessInfoEditor value={value} onChange={setEdits} />
      </div>
    </div>
  );
}

interface ScheduleRow {
  days: string;
  open: string;
  close: string;
  closed: boolean;
}

/**
 * Strip entries the owner added but never filled in. Empty phone, email,
 * website, address, and custom rows would otherwise persist to
 * `settings.business_info` and render as ghost lines on every pass.
 *
 * For hours, drop any schedule row with a blank `days` field, then drop the
 * whole hours entry if no schedule rows survived.
 */
function pruneEmptyEntries(entries: BusinessInfoEntry[]): BusinessInfoEntry[] {
  const cleaned: BusinessInfoEntry[] = [];
  for (const entry of entries) {
    if (entry.type === 'hours') {
      const schedule = ((entry.data.schedule as ScheduleRow[]) || []).filter(
        (row) => (row.days ?? '').trim().length > 0
      );
      if (schedule.length > 0) {
        cleaned.push({ ...entry, data: { ...entry.data, schedule } });
      }
      continue;
    }
    if (entry.type === 'website' && ((entry.data.url as string) ?? '').trim()) {
      cleaned.push(entry);
      continue;
    }
    if (entry.type === 'phone' && ((entry.data.number as string) ?? '').trim()) {
      cleaned.push(entry);
      continue;
    }
    if (entry.type === 'email' && ((entry.data.email as string) ?? '').trim()) {
      cleaned.push(entry);
      continue;
    }
    if (entry.type === 'address' && ((entry.data.address as string) ?? '').trim()) {
      cleaned.push(entry);
      continue;
    }
    if (entry.type === 'custom') {
      const label = ((entry.data.label as string) ?? '').trim();
      const value = ((entry.data.value as string) ?? '').trim();
      // Keep if the owner gave us either a label or a value — both empty
      // would render as a blank line.
      if (label.length > 0 || value.length > 0) {
        cleaned.push(entry);
      }
    }
  }
  return cleaned;
}
