'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/form/form-field';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ImageUploader from '@/components/design/ImageUploader';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getMyProfile, uploadAvatar, deleteAvatar, updateProfile } from '@/api';
import { useAuth } from '@/contexts/auth-provider';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { Info } from '@phosphor-icons/react';
import { LoadingSpinner } from '@/components/reusables/loading-spinner';
import { InfoBox } from '@/components/reusables/info-box';
import { PageHeader } from '@/components/redesign/page-header';

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

  // Password reset state
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

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

  const handleSendResetEmail = async () => {
    const userEmail = profile?.email || authUser?.email;
    if (!userEmail) return;

    setSendingResetEmail(true);
    try {
      const supabase = createClient();
      const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || 'https://stampeo.app';
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${showcaseUrl}/reset-password`,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('rate') || msg.includes('too many') || msg.includes('429')) {
          setError(t('password.rateLimited'));
        } else {
          setError(t('password.sendFailed'));
        }
        return;
      }

      setResetEmailSent(true);
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch {
      setError(t('password.sendFailed'));
    } finally {
      setSendingResetEmail(false);
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
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {error && <InfoBox variant="error" message={error} />}
      {success && <InfoBox variant="success" message={success} />}

      <div className="flex gap-[14px]">
      {/* Sidebar - hidden on mobile */}
      <nav className="hidden md:block w-48 shrink-0">
        <div className="sticky top-6 space-y-1 pr-4">
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
      <div className="flex-1 flex flex-col gap-[14px] pb-10 max-w-2xl">
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

            <InfoBox
              variant="info"
              icon={<Info size={16} weight="fill" className="text-[var(--info)]" />}
              message={t('profilePicture.sharedInfo')}
            />
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card id="password" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('password.title')}</CardTitle>
            <CardDescription>
              {t('password.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetEmailSent && (
              <p className="text-sm text-[var(--success)]">{t('password.emailSent')}</p>
            )}

            <Button
              onClick={handleSendResetEmail}
              disabled={sendingResetEmail}
              variant="gradient"
            >
              {sendingResetEmail ? t('password.sending') : t('password.sendResetEmail')}
            </Button>
          </CardContent>
        </Card>

        {/* Account Info Section */}
        <Card id="account-info" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">{t('accountInfo.title')}</CardTitle>
            <CardDescription>
              {t('accountInfo.description')}
              {savingName && <span className="ml-2 text-[var(--accent)]">{tStatus('saving')}</span>}
              {nameSaved && <span className="ml-2 text-[var(--success)]">{tStatus('saved')}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label={t('accountInfo.name')}
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t('accountInfo.namePlaceholder')}
            />
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
    </div>
  );
}
