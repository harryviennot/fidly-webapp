/**
 * Per-locale default announce-banner copy for the review step.
 *
 * The banner text ships to customers' wallets in EVERY locale, so the
 * prefills can't come from `useTranslations` (which only exposes the UI
 * locale). Import the three conversion.json files directly instead — the
 * strings live there so the copy is reviewed alongside the rest of the
 * wizard's locale files.
 */

import en from '@/../messages/en/conversion.json';
import fr from '@/../messages/fr/conversion.json';
import es from '@/../messages/es/conversion.json';
import type { LoyaltyType } from '@/types';

const FILES = { en, fr, es } as const;

export type AnnounceLocale = keyof typeof FILES;

export const ANNOUNCE_LOCALES: AnnounceLocale[] = ['en', 'fr', 'es'];

export function defaultAnnounceMessages(toType: LoyaltyType): Record<AnnounceLocale, string> {
  const key = toType === 'points' ? 'toPoints' : 'toStamp';
  return {
    en: FILES.en.conversion.announceDefaults[key],
    fr: FILES.fr.conversion.announceDefaults[key],
    es: FILES.es.conversion.announceDefaults[key],
  };
}
