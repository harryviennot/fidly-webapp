'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/business-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { HexColorPicker, BusinessInfoEditor } from '@/components/settings';
import { CardBackPreview } from '@/components/settings/CardBackPreview';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateBusiness, uploadBusinessLogo, deleteBusinessLogo } from '@/api';
import { DEFAULT_ACCENT, applyTheme } from '@/utils/theme';
import type { BusinessInfoEntry } from '@/types/business';
import { PageHeader } from '@/components/redesign';

interface FormData {
  name: string;
  logo_url: string | null;
  accentColor: string;
  backgroundColor: string;
}

export default function SettingsPage() {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const t = useTranslations('settings');
  const tStatus = useTranslations('status');

  const [savingTheme, setSavingTheme] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [themeChanged, setThemeChanged] = useState(false);
  const [savingCardInfo, setSavingCardInfo] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfoEntry[]>([]);
  const [businessInfoDirty, setBusinessInfoDirty] = useState(false);
  const [logoHover, setLogoHover] = useState(false);
  const [pulsing, setPulsing] = useState<'cardInfo' | 'theme' | 'language' | null>(null);
  const [localLocale, setLocalLocale] = useState<string>('fr');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    logo_url: null,
    accentColor: DEFAULT_ACCENT,
    backgroundColor: '#1c1c1e',
  });

  const originalTheme = useRef({ accentColor: DEFAULT_ACCENT, backgroundColor: '#1c1c1e' });
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentBusiness) {
      const settings = currentBusiness.settings || {};
      const accentColor = (settings.accentColor as string) || DEFAULT_ACCENT;
      const backgroundColor = (settings.backgroundColor as string) || '#1c1c1e';

      setFormData({
        name: currentBusiness.name,
        logo_url: currentBusiness.logo_url || null,
        accentColor,
        backgroundColor,
      });

      originalTheme.current = { accentColor, backgroundColor };
      setBusinessInfo((settings.business_info as BusinessInfoEntry[]) || []);
      setLocalLocale(currentBusiness.primary_locale || 'fr');
      setBusinessInfoDirty(false);
    }
  }, [currentBusiness]);

  const handleNameChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, name: value }));
    nameRef.current = value;
    if (nameTimer.current) clearTimeout(nameTimer.current);
    setSavingName(true);
    nameTimer.current = setTimeout(async () => {
      if (!currentBusiness?.id) return;
      try {
        await updateBusiness(currentBusiness.id, { name: nameRef.current });
        queryClient.invalidateQueries({ queryKey: ["business"] });
        setSavedName(true);
        setTimeout(() => setSavedName(false), 2000);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('errors.saveFailed'));
      } finally {
        setSavingName(false);
      }
    }, 1000);
  }, [currentBusiness?.id, t, queryClient]);

  const handleColorChange = (key: 'accentColor' | 'backgroundColor', value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (key === 'accentColor') applyTheme(value);
    const newAccent = key === 'accentColor' ? value : formData.accentColor;
    const newBg = key === 'backgroundColor' ? value : formData.backgroundColor;
    setThemeChanged(
      newAccent !== originalTheme.current.accentColor ||
      newBg !== originalTheme.current.backgroundColor
    );
  };

  const handleSaveTheme = async () => {
    if (!currentBusiness?.id) return;
    setSavingTheme(true);
    setPulsing('theme');
    try {
      await updateBusiness(currentBusiness.id, {
        settings: {
          ...currentBusiness.settings,
          accentColor: formData.accentColor,
          backgroundColor: formData.backgroundColor,
        },
      });
      originalTheme.current = { accentColor: formData.accentColor, backgroundColor: formData.backgroundColor };
      setThemeChanged(false);
      toast.success(t('theme.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.themeSaveFailed'));
    } finally {
      setSavingTheme(false);
      setPulsing(null);
    }
  };

  const handleSaveCardInfo = async () => {
    if (!currentBusiness?.id) return;
    setSavingCardInfo(true);
    setPulsing('cardInfo');
    try {
      await updateBusiness(currentBusiness.id, {
        settings: { ...currentBusiness.settings, business_info: businessInfo },
      });
      setBusinessInfoDirty(false);
      queryClient.invalidateQueries({ queryKey: ["business"] });
      toast.success(t('cardInfo.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cardInfo.saveFailed'));
    } finally {
      setSavingCardInfo(false);
      setPulsing(null);
    }
  };

  const handleSaveLanguage = async (value: string) => {
    if (!currentBusiness?.id) return;
    setLocalLocale(value);
    setPulsing('language');
    try {
      await updateBusiness(currentBusiness.id, {
        primary_locale: value as 'fr' | 'en',
      });
      toast.success(t('language.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setPulsing(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentBusiness?.id) return;
    const result = await uploadBusinessLogo(currentBusiness.id, file);
    setFormData((prev) => ({ ...prev, logo_url: result.url }));
    e.target.value = '';
  };

  const handleLogoDelete = async () => {
    if (!currentBusiness?.id) return;
    await deleteBusinessLogo(currentBusiness.id);
    setFormData((prev) => ({ ...prev, logo_url: null }));
  };

  useEffect(() => {
    return () => {
      if (nameTimer.current) clearTimeout(nameTimer.current);
    };
  }, []);

  if (!currentBusiness) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div
      style={{
        opacity: 1,
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileChange}
      />

      <PageHeader
        title={t('businessInfo.title').split(' ')[0] === 'Business' ? 'Settings' : t('businessInfo.title')}
        subtitle={t('subtitle')}
        className="mb-5"
      />

      <div className="flex gap-3.5 flex-col lg:flex-row items-start">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-3.5 min-w-0 w-full">

          {/* ── Business Information ── */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] px-6 py-5">
            <div className="text-base font-semibold text-[#1A1A1A] mb-1">
              {t('businessInfo.title')}
            </div>
            <div className="text-xs text-[#A0A0A0] mb-5">
              {t('businessInfo.description')}
              <span className="inline-grid [&>*]:col-start-1 [&>*]:row-start-1 ml-2">
                <span className={`text-[11px] text-[#A0A0A0] transition-opacity duration-300 ${savingName ? 'opacity-100 animate-pulse' : 'opacity-0'}`}>{tStatus('saving')}</span>
                <span className={`text-[11px] text-[var(--accent)] transition-opacity duration-300 ${savedName && !savingName ? 'opacity-100' : 'opacity-0'}`}>{tStatus('saved')}</span>
              </span>
            </div>

            <div className="flex gap-5 items-start sm:items-center flex-col sm:flex-row">
              {/* Logo */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  className="relative min-w-20 min-h-20 max-h-24  overflow-hidden cursor-pointer p-0 border-0"
                  style={{ boxShadow: `0 4px 16px ${formData.accentColor}30` }}
                  onMouseEnter={() => setLogoHover(true)}
                  onMouseLeave={() => setLogoHover(false)}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Modifier l'image"
                >
                  {formData.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.logo_url}
                      alt={formData.name}
                      className="h-full max-h-24 w-auto object-contain"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 flex items-center justify-center text-white text-3xl font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${formData.accentColor}, ${formData.accentColor}CC)`,
                      }}
                    >
                      {formData.name.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1 transition-opacity duration-200"
                    style={{ opacity: logoHover ? 1 : 0 }}
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="10" cy="10" r="3.5" />
                      <path d="M2 10a8 8 0 1016 0A8 8 0 002 10" />
                      <path d="M10 6v1M10 13v1M6 10H5M15 10h-1" strokeWidth="1" />
                    </svg>
                    <span className="text-white text-[9px] font-semibold">
                      Modifier l&apos;image
                    </span>
                  </div>
                </button>
                {formData.logo_url && (
                  <button
                    onClick={handleLogoDelete}
                    className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                  >
                    {t('businessInfo.remove')}
                  </button>
                )}
                {!formData.logo_url && (
                  <span className="text-[10px] text-[#AAA]">Logo</span>
                )}
              </div>

              {/* Business name */}
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-[#555] mb-1.5">
                  {t('businessInfo.businessName')}
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('businessInfo.businessNamePlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DEDBD5] bg-white text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[var(--accent)]"
                />
                <div className="text-[11px] text-[#B0B0B0] mt-1">
                  {t('businessInfo.nameHint')}
                </div>
              </div>
            </div>
          </div>

          {/* ── Card Back Fields ── */}
          <div className={`bg-[var(--card)] rounded-xl border border-[var(--card-border)] px-6 py-5 transition-shadow${pulsing === 'cardInfo' ? ' ring-2 ring-[var(--accent)]/25 animate-pulse' : ''}`}>
            <div className="text-base font-semibold text-[#1A1A1A] mb-1">
              {t('cardInfo.title')}
            </div>
            <div className="text-xs text-[#A0A0A0] mb-4">
              {t('cardInfo.description')}
            </div>

            <BusinessInfoEditor
              value={businessInfo}
              onChange={(v) => { setBusinessInfo(v); setBusinessInfoDirty(true); }}
            />

            <div className="flex items-center justify-end pt-4 mt-4 border-t border-[var(--border)]">
              <Button
                onClick={handleSaveCardInfo}
                disabled={savingCardInfo || !businessInfoDirty}
                style={businessInfoDirty ? { background: 'var(--accent)', color: '#fff', border: 'none' } : undefined}
                variant={businessInfoDirty ? 'default' : 'outline'}
                className="px-4 py-2 rounded-lg text-sm font-medium"
              >
                {savingCardInfo ? t('cardInfo.saving') : t('cardInfo.save')}
              </Button>
            </div>
          </div>

          {/* ── Language ── */}
          <div className={`bg-[var(--card)] rounded-xl border border-[var(--card-border)] px-6 py-5 transition-shadow${pulsing === 'language' ? ' ring-2 ring-[var(--accent)]/25 animate-pulse' : ''}`}>
            <div className="text-base font-semibold text-[#1A1A1A] mb-1">
              {t('language.title')}
            </div>
            <div className="text-xs text-[#A0A0A0] mb-4">
              {t('language.description')}
            </div>

            <div className="max-w-xs">
              <Label className="text-xs font-semibold text-[#555] mb-1.5 block">
                {t('language.passLocale')}
              </Label>
              <Select
                value={localLocale}
                onValueChange={handleSaveLanguage}
              >
                <SelectTrigger className="w-full border-[#DEDBD5] rounded-lg h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-[#B0B0B0] mt-1.5">{t('language.passLocaleHint')}</p>
            </div>
          </div>

          {/* ── Branding ── */}
          <div className={`bg-[var(--card)] rounded-xl border border-[var(--card-border)] px-6 py-5 transition-shadow${pulsing === 'theme' ? ' ring-2 ring-[var(--accent)]/25 animate-pulse' : ''}`}>
            <div className="text-base font-semibold text-[#1A1A1A] mb-1">
              {t('theme.title')}
            </div>
            <div className="text-xs text-[#A0A0A0] mb-5">
              {t('theme.description')}
            </div>

            <div className="flex gap-6 flex-col sm:flex-row">
              <div className="flex-1">
                <HexColorPicker
                  label={t('theme.accentColor')}
                  value={formData.accentColor}
                  onChange={(c) => handleColorChange('accentColor', c)}
                />
                <div className="text-[11px] text-[#B0B0B0] mt-2">
                  {t('theme.accentColorHint')}
                </div>
              </div>
              <div className="flex-1">
                <HexColorPicker
                  label={t('theme.backgroundColor')}
                  value={formData.backgroundColor}
                  onChange={(c) => handleColorChange('backgroundColor', c)}
                />
                <div className="text-[11px] text-[#B0B0B0] mt-2">
                  {t('theme.backgroundColorHint')}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[#A0A0A0]">
                {themeChanged ? t('theme.unsavedChanges') : t('theme.upToDate')}
              </p>
              <Button
                onClick={handleSaveTheme}
                disabled={savingTheme || !themeChanged}
                style={themeChanged ? { background: 'var(--accent)', color: '#fff', border: 'none' } : undefined}
                variant={themeChanged ? 'default' : 'outline'}
                className="px-4 py-2 rounded-lg text-sm font-medium"
              >
                {savingTheme ? tStatus('saving') : t('theme.saveTheme')}
              </Button>
            </div>
          </div>

        </div>

        {/* Right column — sticky preview */}
        <div className="w-full lg:w-[290px] lg:shrink-0">
          <div className="lg:sticky lg:top-6">
            <CardBackPreview
              businessName={formData.name}
              logoUrl={formData.logo_url}
              fields={businessInfo}
              accentColor={formData.accentColor}
              backgroundColor={formData.backgroundColor}
              locale={currentBusiness.primary_locale || 'fr'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
