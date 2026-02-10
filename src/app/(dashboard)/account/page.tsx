'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ImageUploader from '@/components/design/ImageUploader';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getMyProfile, uploadAvatar, deleteAvatar, updateProfile } from '@/api';
import { useAuth } from '@/contexts/auth-provider';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { Info } from 'lucide-react';

export default function AccountPage() {
  const { user: authUser } = useAuth();
  const t = useTranslations('account');
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('profile-picture');
  const [avatarKey, setAvatarKey] = useState(Date.now());

  const sections = [
    { id: 'profile-picture' as const, label: t('sections.profilePicture') },
    { id: 'password' as const, label: t('sections.password') },
    { id: 'account-info' as const, label: t('sections.accountInfo') },
    { id: 'language' as const, label: t('sections.language') },
  ];

  // Name editing state
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const saveNameTimer = useRef<NodeJS.Timeout | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // IntersectionObserver for scroll tracking
  useEffect(() => {
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

    const ids = ['profile-picture', 'password', 'account-info', 'language'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const loadProfile = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
      setName(data.name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Save name (debounced)
  const saveName = useCallback(async (newName: string) => {
    setSavingName(true);
    setError(null);
    try {
      const updated = await updateProfile({ name: newName });
      setProfile(prev => prev ? { ...prev, name: updated.name } : null);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setSavingName(false);
    }
  }, [t]);

  // Handle name change with debounced auto-save
  const handleNameChange = (value: string) => {
    setName(value);
    setNameSaved(false);

    // Clear existing timer
    if (saveNameTimer.current) {
      clearTimeout(saveNameTimer.current);
    }

    // Set new timer for auto-save after 1.5 seconds
    saveNameTimer.current = setTimeout(() => {
      saveName(value);
    }, 1500);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveNameTimer.current) {
        clearTimeout(saveNameTimer.current);
      }
    };
  }, []);

  const handleAvatarUpload = async (file: File) => {
    setError(null);
    try {
      const result = await uploadAvatar(file);
      // Add cache-busting timestamp to force image refresh
      const urlWithCacheBust = `${result.url}?t=${Date.now()}`;
      setProfile(prev => prev ? { ...prev, avatar_url: urlWithCacheBust } : null);
      setAvatarKey(Date.now());
      setSuccess(t('profilePicture.updated'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.uploadFailed'));
    }
  };

  const handleAvatarDelete = async () => {
    setError(null);
    try {
      await deleteAvatar();
      setProfile(prev => prev ? { ...prev, avatar_url: undefined } : null);
      setAvatarKey(Date.now());
      setSuccess(t('profilePicture.removed'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.deleteFailed'));
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError(t('password.mismatch'));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t('password.tooShort'));
      return;
    }

    setChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('password.changePassword'));
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get avatar URL with cache busting
  const getAvatarUrl = () => {
    if (!profile?.avatar_url) return undefined;
    // If already has query params, don't add more
    if (profile.avatar_url.includes('?')) return profile.avatar_url;
    return `${profile.avatar_url}?t=${avatarKey}`;
  };

  const tStatus = useTranslations('status');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar - hidden on mobile */}
      <nav className="hidden md:block w-48 shrink-0">
        <div className="sticky top-[92px] space-y-1 pr-4">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors',
                activeSection === section.id
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/5'
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 space-y-6 pb-10 max-w-2xl">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Profile Picture Section */}
        <Card id="profile-picture" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('profilePicture.title')}</CardTitle>
            <CardDescription>
              {t('profilePicture.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage key={avatarKey} src={getAvatarUrl()} className="object-cover" />
                <AvatarFallback className="text-2xl bg-[var(--accent-muted)] text-[var(--accent)]">
                  {getInitials(profile?.name || authUser?.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <ImageUploader
                  label=""
                  value={getAvatarUrl()}
                  onUpload={handleAvatarUpload}
                  onClear={handleAvatarDelete}
                  accept="image/png,image/jpeg"
                  hint={t('profilePicture.hint')}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                {t('profilePicture.sharedInfo')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Section */}
        <Card id="password" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('password.title')}</CardTitle>
            <CardDescription>
              {t('password.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('password.newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('password.newPasswordPlaceholder')}
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('password.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('password.confirmPasswordPlaceholder')}
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}

              {passwordSuccess && (
                <p className="text-sm text-green-600">{t('password.success')}</p>
              )}

              <Button
                type="submit"
                disabled={changingPassword || !newPassword || !confirmPassword}
                variant="gradient"
              >
                {changingPassword ? t('password.changing') : t('password.changePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Info Section */}
        <Card id="account-info" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('accountInfo.title')}</CardTitle>
            <CardDescription>
              {t('accountInfo.description')}
              {savingName && <span className="ml-2 text-[var(--accent)]">{tStatus('saving')}</span>}
              {nameSaved && <span className="ml-2 text-green-600">{tStatus('saved')}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('accountInfo.name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('accountInfo.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('accountInfo.email')}</Label>
              <p className="font-medium text-sm">{profile?.email || authUser?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Language Section */}
        <Card id="language" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('language.title')}</CardTitle>
            <CardDescription>
              {t('language.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t('language.label')}</Label>
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
