'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useBusiness } from '@/contexts/business-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/form/form-field';
import { Label } from '@/components/ui/label';
import { SettingsSidebar, HexColorPicker, BusinessInfoEditor } from '@/components/settings';
import ImageUploader from '@/components/design/ImageUploader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateBusiness, uploadBusinessLogo, deleteBusinessLogo } from '@/api';
import { DEFAULT_ACCENT, applyTheme } from '@/utils/theme';
import type { BusinessInfoEntry } from '@/types/business';

interface FormData {
  name: string;
  logo_url: string | null;
  accentColor: string;
  backgroundColor: string;
}

export default function SettingsPage() {
  const { currentBusiness, refetch } = useBusiness();
  const t = useTranslations('settings');
  const tStatus = useTranslations('status');
  const [activeSection, setActiveSection] = useState('business-info');
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themeChanged, setThemeChanged] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const [savingCardInfo, setSavingCardInfo] = useState(false);
  const [cardInfoSaved, setCardInfoSaved] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfoEntry[]>([]);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    logo_url: null,
    accentColor: DEFAULT_ACCENT,
    backgroundColor: '#1c1c1e',
  });

  // Track original theme values to detect changes
  const originalTheme = useRef({ accentColor: DEFAULT_ACCENT, backgroundColor: '#1c1c1e' });

  // Debounce timer for auto-save
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize form data when business loads
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
    }
  }, [currentBusiness]);

  // IntersectionObserver for scroll tracking
  useEffect(() => {
    const sections = ['business-info', 'card-info', 'language', 'theme'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -80% 0px' }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Auto-save business info (debounced)
  const saveBusinessInfo = useCallback(async () => {
    if (!currentBusiness?.id) return;

    setSavingInfo(true);
    setError(null);

    try {
      await updateBusiness(currentBusiness.id, {
        name: formData.name,
        settings: {
          ...currentBusiness.settings,
          accentColor: formData.accentColor,
          backgroundColor: formData.backgroundColor,
        },
      });
      setInfoSaved(true);
      setTimeout(() => setInfoSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setSavingInfo(false);
    }
  }, [currentBusiness, formData.name, formData.accentColor, formData.backgroundColor, t]);

  // Handle name change with debounced auto-save
  const handleNameChange = (value: string) => {
    setFormData((prev) => ({ ...prev, name: value }));
    setInfoSaved(false);

    // Clear existing timer
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    // Set new timer for auto-save after 3 seconds
    saveTimer.current = setTimeout(() => {
      saveBusinessInfo();
    }, 3000);
  };

  // Handle color change with real-time preview
  const handleColorChange = (key: 'accentColor' | 'backgroundColor', value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));

    // Apply theme in real-time for preview
    if (key === 'accentColor') {
      applyTheme(value);
    }

    // Check if theme has changed from original
    const newAccent = key === 'accentColor' ? value : formData.accentColor;
    const newBg = key === 'backgroundColor' ? value : formData.backgroundColor;
    const hasChanged =
      newAccent !== originalTheme.current.accentColor ||
      newBg !== originalTheme.current.backgroundColor;
    setThemeChanged(hasChanged);
  };

  // Save theme to database
  const handleSaveTheme = async () => {
    if (!currentBusiness?.id) return;

    setSavingTheme(true);
    setError(null);

    try {
      await updateBusiness(currentBusiness.id, {
        settings: {
          ...currentBusiness.settings,
          accentColor: formData.accentColor,
          backgroundColor: formData.backgroundColor,
        },
      });

      // Update original values
      originalTheme.current = {
        accentColor: formData.accentColor,
        backgroundColor: formData.backgroundColor,
      };
      setThemeChanged(false);

      // Refresh context
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.themeSaveFailed'));
    } finally {
      setSavingTheme(false);
    }
  };

  // Handle logo upload (auto-saves)
  const handleLogoUpload = async (file: File) => {
    if (!currentBusiness?.id) return;
    const result = await uploadBusinessLogo(currentBusiness.id, file);
    setFormData((prev) => ({ ...prev, logo_url: result.url }));
    await refetch();
  };

  // Handle logo delete (auto-saves)
  const handleLogoDelete = async () => {
    if (!currentBusiness?.id) return;
    await deleteBusinessLogo(currentBusiness.id);
    setFormData((prev) => ({ ...prev, logo_url: null }));
    await refetch();
  };

  // Save card info
  const handleSaveCardInfo = async () => {
    if (!currentBusiness?.id) return;
    setSavingCardInfo(true);
    setError(null);
    try {
      await updateBusiness(currentBusiness.id, {
        settings: {
          ...currentBusiness.settings,
          business_info: businessInfo,
        },
      });
      setCardInfoSaved(true);
      setTimeout(() => setCardInfoSaved(false), 2000);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cardInfo.saveFailed'));
    } finally {
      setSavingCardInfo(false);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
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
    <div className="flex gap-6">
      <SettingsSidebar activeSection={activeSection} />

      <div className="flex-1 space-y-6 pb-10 max-w-2xl">
        {/* Business Information Section */}
        <Card id="business-info" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('businessInfo.title')}</CardTitle>
            <CardDescription>
              {t('businessInfo.description')}
              {savingInfo && <span className="ml-2 text-[var(--accent)]">{tStatus('saving')}</span>}
              {infoSaved && <span className="ml-2 text-green-600">{tStatus('saved')}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              label={t('businessInfo.businessName')}
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t('businessInfo.businessNamePlaceholder')}
            />

            <div className="space-y-2">
              <Label>{t('businessInfo.businessLogo')}</Label>
              <ImageUploader
                label=""
                value={formData.logo_url || undefined}
                onUpload={handleLogoUpload}
                onClear={handleLogoDelete}
                accept="image/png,image/jpeg"
                hint={t('businessInfo.logoHint')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card Info Section */}
        <Card id="card-info" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('cardInfo.title')}</CardTitle>
            <CardDescription>{t('cardInfo.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BusinessInfoEditor
              value={businessInfo}
              onChange={setBusinessInfo}
            />
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <p className="text-sm text-muted-foreground">
                {cardInfoSaved && <span className="text-green-600">{t('cardInfo.saved')}</span>}
              </p>
              <Button
                onClick={handleSaveCardInfo}
                disabled={savingCardInfo}
                variant="gradient"
              >
                {savingCardInfo ? t('cardInfo.saving') : t('cardInfo.save')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Language Section */}
        <Card id="language" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('language.title')}</CardTitle>
            <CardDescription>{t('language.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('language.passLocale')}</Label>
              <Select
                value={currentBusiness.primary_locale || 'fr'}
                onValueChange={async (value: string) => {
                  try {
                    await updateBusiness(currentBusiness.id, {
                      primary_locale: value as 'fr' | 'en',
                    });
                    await refetch();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : t('errors.saveFailed'));
                  }
                }}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{t('language.passLocaleHint')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Theme Section */}
        <Card id="theme" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('theme.title')}</CardTitle>
            <CardDescription>{t('theme.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <HexColorPicker
              label={t('theme.accentColor')}
              value={formData.accentColor}
              onChange={(c) => handleColorChange('accentColor', c)}
            />
            <HexColorPicker
              label={t('theme.backgroundColor')}
              value={formData.backgroundColor}
              onChange={(c) => handleColorChange('backgroundColor', c)}
            />

            {/* Save Theme Button */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--muted-foreground)]">
                {themeChanged ? t('theme.unsavedChanges') : t('theme.upToDate')}
              </p>
              <Button
                onClick={handleSaveTheme}
                disabled={savingTheme || !themeChanged}
                variant="gradient"
              >
                {savingTheme ? tStatus('saving') : t('theme.saveTheme')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
