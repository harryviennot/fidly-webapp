'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ImageUploader from '@/components/design/ImageUploader';
import { getMyProfile, uploadAvatar, deleteAvatar } from '@/api';
import { useAuth } from '@/contexts/auth-provider';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { Info } from 'lucide-react';

const sections = [
  { id: 'profile-picture', label: 'Profile Picture' },
  { id: 'password', label: 'Password' },
  { id: 'account-info', label: 'Account Info' },
];

export default function AccountPage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('profile-picture');
  const [avatarKey, setAvatarKey] = useState(Date.now());

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

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

    sections.forEach(({ id }) => {
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

  const loadProfile = async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setError(null);
    try {
      const result = await uploadAvatar(file);
      // Add cache-busting timestamp to force image refresh
      const urlWithCacheBust = `${result.url}?t=${Date.now()}`;
      setProfile(prev => prev ? { ...prev, avatar_url: urlWithCacheBust } : null);
      setAvatarKey(Date.now());
      setSuccess('Profile picture updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleAvatarDelete = async () => {
    setError(null);
    try {
      await deleteAvatar();
      setProfile(prev => prev ? { ...prev, avatar_url: undefined } : null);
      setAvatarKey(Date.now());
      setSuccess('Profile picture removed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
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
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <nav className="w-48 shrink-0">
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
            <CardTitle className="text-lg">Profile Picture</CardTitle>
            <CardDescription>
              Your profile picture is visible to all team members across all businesses you belong to.
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
                  hint="PNG or JPG, max 2MB. Square images work best."
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Your profile picture is shared across all businesses you are a member of.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Section */}
        <Card id="password" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">Change Password</CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}

              {passwordSuccess && (
                <p className="text-sm text-green-600">Password changed successfully!</p>
              )}

              <Button
                type="submit"
                disabled={changingPassword || !newPassword || !confirmPassword}
                variant="gradient"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Info Section (read-only) */}
        <Card id="account-info" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium">{profile?.name || 'Not set'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{profile?.email || authUser?.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
