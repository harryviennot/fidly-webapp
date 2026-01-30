'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SettingsSidebar, HexColorPicker } from '@/components/settings';
import ImageUploader from '@/components/design/ImageUploader';
import { updateBusiness, uploadBusinessLogo, deleteBusinessLogo } from '@/api';
import { DEFAULT_ACCENT, applyTheme } from '@/utils/theme';

interface FormData {
  name: string;
  logo_url: string | null;
  accentColor: string;
  backgroundColor: string;
}

export default function SettingsPage() {
  const { currentBusiness, refetch } = useBusiness();
  const [activeSection, setActiveSection] = useState('business-info');
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themeChanged, setThemeChanged] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);

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
    }
  }, [currentBusiness]);

  // IntersectionObserver for scroll tracking
  useEffect(() => {
    const sections = ['business-info', 'theme'];
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
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingInfo(false);
    }
  }, [currentBusiness, formData.name, formData.accentColor, formData.backgroundColor]);

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
      setError(err instanceof Error ? err.message : 'Failed to save theme');
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
            <CardTitle className="text-lg">Business Information</CardTitle>
            <CardDescription>
              Update your business name and logo
              {savingInfo && <span className="ml-2 text-[var(--accent)]">Saving...</span>}
              {infoSaved && <span className="ml-2 text-green-600">Saved</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Business"
              />
            </div>

            <div className="space-y-2">
              <Label>Business Logo</Label>
              <ImageUploader
                label=""
                value={formData.logo_url || undefined}
                onUpload={handleLogoUpload}
                onClear={handleLogoDelete}
                accept="image/png,image/jpeg"
                hint="PNG or JPG, max 2MB"
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme Section */}
        <Card id="theme" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">Theme Customization</CardTitle>
            <CardDescription>Customize the colors of your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <HexColorPicker
              label="Accent Color"
              value={formData.accentColor}
              onChange={(c) => handleColorChange('accentColor', c)}
            />
            <HexColorPicker
              label="Background Color"
              value={formData.backgroundColor}
              onChange={(c) => handleColorChange('backgroundColor', c)}
            />

            {/* Save Theme Button */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--muted-foreground)]">
                {themeChanged ? 'You have unsaved changes' : 'Theme is up to date'}
              </p>
              <Button
                onClick={handleSaveTheme}
                disabled={savingTheme || !themeChanged}
                variant="gradient"
              >
                {savingTheme ? 'Saving...' : 'Save Theme'}
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
