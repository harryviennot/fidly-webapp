'use client';

import { createContext, useContext } from 'react';
import type { CardDesignCreate } from '@/types';
import type { BusinessInfoEntry } from '@/types/business';

/**
 * Shared context for the four design sub-forms (Branding, Stamps, Content, Back).
 * The dashboard editor (`DesignEditorV2`) provides this from its own state;
 * the wizard's design chapter provider plugs into the same shape so the forms
 * are reused unchanged.
 */
export interface DesignFormContextValue {
  // ── State ────────────────────────────────────────────────────────────
  formData: CardDesignCreate;
  customColors: string[];
  businessInfo: BusinessInfoEntry[];
  showAdvancedStamps: boolean;

  // ── Computed (hex strings + contrast ratios) ─────────────────────────
  bgHex: string;
  labelHex: string;
  textHex: string;
  accentHex: string;
  iconHex: string;
  emptyStampHex: string;
  borderColorHex: string;
  labelContrast: number;
  textContrast: number;

  // ── Field updates ────────────────────────────────────────────────────
  updateField: <K extends keyof CardDesignCreate>(key: K, value: CardDesignCreate[K]) => void;
  updateColorField: (
    key:
      | 'background_color'
      | 'stamp_filled_color'
      | 'label_color'
      | 'foreground_color'
      | 'stamp_empty_color'
      | 'stamp_border_color'
      | 'icon_color',
    hex: string
  ) => void;
  addCustomColor: (hex: string) => void;
  setShowAdvancedStamps: (v: boolean) => void;
  /** Stamp icon color is auto-derived from the stamp fill until the user picks one. */
  setIconColorOverridden: (v: boolean) => void;

  // ── Image handlers ───────────────────────────────────────────────────
  handleLogoUpload: (file: File) => Promise<void>;
  handleLogoClear: () => void;
  handleStripBackgroundUpload: (file: File) => Promise<void>;
  handleStripBackgroundClear: () => void;

  // ── Business info (BackForm) ─────────────────────────────────────────
  toggleBusinessInfoKey: (key: string) => void;
}

const DesignFormContext = createContext<DesignFormContextValue | null>(null);

export function DesignFormProvider({
  value,
  children,
}: {
  value: DesignFormContextValue;
  children: React.ReactNode;
}) {
  return <DesignFormContext.Provider value={value}>{children}</DesignFormContext.Provider>;
}

export function useDesignForm(): DesignFormContextValue {
  const ctx = useContext(DesignFormContext);
  if (!ctx) {
    throw new Error('useDesignForm must be used inside <DesignFormProvider>');
  }
  return ctx;
}
