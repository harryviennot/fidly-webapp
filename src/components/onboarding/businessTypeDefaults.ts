import type { ColorPreset } from '@/lib/color-utils';
import { hexToRgb } from '@/lib/color-utils';
import type { StampIconType } from '@/components/design/StampIconPicker';

/**
 * Step-2 (`business/profile`) collects a `business_type` chip and a `team_size`
 * chip. This module turns those answers into smart defaults that seed the
 * later wizard steps (program, design, first-broadcast) so a café owner doesn't
 * see the same generic blanks as a fitness studio.
 *
 * IMPORTANT: these values are *seeds* — they only feed first-visit defaults
 * inside the existing `!seen` branches and the `useWizardDraft` fallback
 * factories. Once a user types or picks something, that value wins. Nothing
 * here ever clobbers persisted data.
 */

export type BusinessType =
  | 'cafe'
  | 'restaurant'
  | 'bakery'
  | 'beauty'
  | 'retail'
  | 'fitness'
  | 'services'
  | 'other';

export interface BusinessTypeDefaults {
  /** Default stamp count for the program step. Higher-ticket types (beauty,
   *  services) ship lower so the first reward stays reachable. */
  totalStamps: number;
  /** i18n key under `onboardingBusiness.defaults.rewardName.<type>`. */
  rewardNameKey: string;
  /** i18n key under `onboardingBusiness.defaults.broadcastBody.<type>`. */
  broadcastBodyKey: string;
  /** Stamp icon shown on the loyalty card stamps. */
  stampIcon: StampIconType;
  /** Reward icon shown for the final reward stamp. */
  rewardIcon: StampIconType;
  /** Seed card background colour as an `rgb(r, g, b)` string (CardDesign convention). */
  backgroundColor: string;
  /** Seed filled-stamp colour as an `rgb(r, g, b)` string. */
  stampFilledColor: string;
  /** 15-entry palette shown in the wizard's design colour pickers:
   *  8 type-themed colours followed by 7 universal neutrals. */
  palette: readonly ColorPreset[];
}

/** Always-on neutrals appended to every type's palette so the user can reach
 *  brand orange + the standard grayscale ramp from any business type. */
const UNIVERSAL_NEUTRALS: readonly ColorPreset[] = [
  { name: 'Stampeo Orange', value: '#F97316' },
  { name: 'Charcoal', value: '#2D2D2D' },
  { name: 'Black', value: '#1A1A1A' },
  { name: 'Stone', value: '#6B6B6B' },
  { name: 'Gray', value: '#888888' },
  { name: 'Linen', value: '#E8E5DE' },
  { name: 'White', value: '#FFFFFF' },
];

const themed = (presets: ColorPreset[]): readonly ColorPreset[] => [
  ...presets,
  ...UNIVERSAL_NEUTRALS,
];

export const BUSINESS_TYPE_DEFAULTS: Record<BusinessType, BusinessTypeDefaults> = {
  cafe: {
    totalStamps: 10,
    rewardNameKey: 'rewardName.cafe',
    broadcastBodyKey: 'broadcastBody.cafe',
    stampIcon: 'coffee',
    rewardIcon: 'gift',
    backgroundColor: hexToRgb('#3D2417'),
    stampFilledColor: hexToRgb('#C68642'),
    palette: themed([
      { name: 'Espresso', value: '#3D2417' },
      { name: 'Mocha', value: '#6F4E37' },
      { name: 'Caramel', value: '#C68642' },
      { name: 'Amber', value: '#C4883D' },
      { name: 'Russet', value: '#9D5C2A' },
      { name: 'Cream', value: '#F5E6D3' },
      { name: 'Crimson', value: '#A03D3D' },
      { name: 'Coral', value: '#C75050' },
    ]),
  },
  restaurant: {
    totalStamps: 10,
    rewardNameKey: 'rewardName.restaurant',
    broadcastBodyKey: 'broadcastBody.restaurant',
    stampIcon: 'food',
    rewardIcon: 'percent',
    backgroundColor: hexToRgb('#5C0E1B'),
    stampFilledColor: hexToRgb('#C75050'),
    palette: themed([
      { name: 'Bordeaux', value: '#5C0E1B' },
      { name: 'Wine', value: '#722F37' },
      { name: 'Crimson', value: '#A03D3D' },
      { name: 'Coral', value: '#C75050' },
      { name: 'Amber', value: '#C4883D' },
      { name: 'Olive', value: '#6B7821' },
      { name: 'Sage', value: '#4A7C59' },
      { name: 'Berry', value: '#6B3A6B' },
    ]),
  },
  bakery: {
    totalStamps: 10,
    rewardNameKey: 'rewardName.bakery',
    broadcastBodyKey: 'broadcastBody.bakery',
    stampIcon: 'food',
    rewardIcon: 'gift',
    backgroundColor: hexToRgb('#6F4E37'),
    stampFilledColor: hexToRgb('#C68642'),
    palette: themed([
      { name: 'Mocha', value: '#6F4E37' },
      { name: 'Caramel', value: '#C68642' },
      { name: 'Wheat', value: '#E8C99B' },
      { name: 'Cream', value: '#F5E6D3' },
      { name: 'Amber', value: '#C4883D' },
      { name: 'Honey', value: '#E1A95F' },
      { name: 'Coral', value: '#C75050' },
      { name: 'Sage', value: '#4A7C59' },
    ]),
  },
  beauty: {
    totalStamps: 8,
    rewardNameKey: 'rewardName.beauty',
    broadcastBodyKey: 'broadcastBody.beauty',
    stampIcon: 'sparkle',
    rewardIcon: 'heart',
    backgroundColor: hexToRgb('#6B3A6B'),
    stampFilledColor: hexToRgb('#E8A0BF'),
    palette: themed([
      { name: 'Berry', value: '#6B3A6B' },
      { name: 'Plum', value: '#8B5A8B' },
      { name: 'Mauve', value: '#997A8D' },
      { name: 'Rose', value: '#E8A0BF' },
      { name: 'Blush', value: '#F4C2C2' },
      { name: 'Lavender', value: '#B19CD9' },
      { name: 'Champagne', value: '#F7E7CE' },
      { name: 'Coral', value: '#C75050' },
    ]),
  },
  retail: {
    totalStamps: 10,
    rewardNameKey: 'rewardName.retail',
    broadcastBodyKey: 'broadcastBody.retail',
    stampIcon: 'shopping',
    rewardIcon: 'percent',
    backgroundColor: hexToRgb('#2D5F8A'),
    stampFilledColor: hexToRgb('#3D7CAF'),
    palette: themed([
      { name: 'Ocean', value: '#2D5F8A' },
      { name: 'Sky', value: '#3D7CAF' },
      { name: 'Teal', value: '#2C7DA0' },
      { name: 'Magenta', value: '#D63384' },
      { name: 'Coral', value: '#C75050' },
      { name: 'Crimson', value: '#A03D3D' },
      { name: 'Plum', value: '#8B5A8B' },
      { name: 'Amber', value: '#C4883D' },
    ]),
  },
  fitness: {
    totalStamps: 10,
    rewardNameKey: 'rewardName.fitness',
    broadcastBodyKey: 'broadcastBody.fitness',
    stampIcon: 'lightning',
    rewardIcon: 'trophy',
    backgroundColor: hexToRgb('#2D2D2D'),
    stampFilledColor: hexToRgb('#4A7C59'),
    palette: themed([
      { name: 'Sage', value: '#4A7C59' },
      { name: 'Forest', value: '#3D6B4A' },
      { name: 'Sky', value: '#3D7CAF' },
      { name: 'Ocean', value: '#2D5F8A' },
      { name: 'Crimson', value: '#A03D3D' },
      { name: 'Steel', value: '#5A7A8C' },
      { name: 'Lime', value: '#B9F227' },
      { name: 'Amber', value: '#C4883D' },
    ]),
  },
  services: {
    totalStamps: 8,
    rewardNameKey: 'rewardName.services',
    broadcastBodyKey: 'broadcastBody.services',
    stampIcon: 'checkmark',
    rewardIcon: 'gift',
    backgroundColor: hexToRgb('#1B2A41'),
    stampFilledColor: hexToRgb('#F97316'),
    palette: themed([
      { name: 'Navy', value: '#1B2A41' },
      { name: 'Ocean', value: '#2D5F8A' },
      { name: 'Sky', value: '#3D7CAF' },
      { name: 'Slate', value: '#3B4252' },
      { name: 'Forest', value: '#3D6B4A' },
      { name: 'Sage', value: '#4A7C59' },
      { name: 'Bronze', value: '#8B6F47' },
      { name: 'Plum', value: '#8B5A8B' },
    ]),
  },
  other: {
    totalStamps: 10,
    rewardNameKey: 'rewardName.other',
    broadcastBodyKey: 'broadcastBody.other',
    stampIcon: 'checkmark',
    rewardIcon: 'gift',
    backgroundColor: hexToRgb('#2D2D2D'),
    stampFilledColor: hexToRgb('#F97316'),
    palette: themed([
      { name: 'Stampeo Orange', value: '#F97316' },
      { name: 'Amber', value: '#C4883D' },
      { name: 'Coral', value: '#C75050' },
      { name: 'Crimson', value: '#A03D3D' },
      { name: 'Plum', value: '#8B5A8B' },
      { name: 'Ocean', value: '#2D5F8A' },
      { name: 'Sky', value: '#3D7CAF' },
      { name: 'Sage', value: '#4A7C59' },
    ]),
  },
};

/** Resolve a `business_type` string from `businesses.settings` into the matching
 *  defaults profile. Unknown / `null` / `undefined` types fall back to `other`
 *  so callers never have to null-check. */
export function getBusinessTypeDefaults(
  businessType: string | null | undefined
): BusinessTypeDefaults {
  if (!businessType) return BUSINESS_TYPE_DEFAULTS.other;
  if (businessType in BUSINESS_TYPE_DEFAULTS) {
    return BUSINESS_TYPE_DEFAULTS[businessType as BusinessType];
  }
  return BUSINESS_TYPE_DEFAULTS.other;
}

/** Wizard-draft key ProfileStep writes the picked business-type chip into.
 *  Exposed so later steps can read it synchronously — settings cache lags
 *  behind ProfileStep's background save by a few hundred ms, so reading from
 *  settings alone seeds defaults from the universal `other` profile and the
 *  user briefly sees the wrong reward / icon / colours. */
export const PROFILE_BUSINESS_TYPE_DRAFT_KEY = 'profile.businessType';
/** Wizard-draft key ProfileStep writes the picked team-size chip into. Same
 *  rationale as the business-type key — used by `getVisibleChapters` to hide
 *  the team chapter for solo owners the moment they pick the chip, not after
 *  the background save lands. */
export const PROFILE_TEAM_SIZE_DRAFT_KEY = 'profile.teamSize';
