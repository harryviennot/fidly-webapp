"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  PlusIcon,
  CopyIcon,
  CheckIcon,
  QrCodeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusiness } from "@/contexts/business-context";
import { getDesigns, deleteDesign, activateDesign, duplicateDesign, updateBusiness } from "@/api";
import { ActiveCardWidget } from "@/components/loyalty-program/overview/ActiveCardWidget";
import { TemplateGrid } from "@/components/loyalty-program/templates/TemplateGrid";
import { toast } from "sonner";
import type { CardDesign } from "@/types";

interface DataCollectionSettings {
  collect_name: boolean;
  collect_email: boolean;
  collect_phone: boolean;
}

export default function LoyaltyProgramPage() {
  const { currentBusiness, refetch } = useBusiness();
  const t = useTranslations('loyaltyProgram');
  const tDesign = useTranslations('designEditor');

  // Design state
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<DataCollectionSettings>({
    collect_name: false,
    collect_email: false,
    collect_phone: false,
  });
  const [saving, setSaving] = useState(false);

  // Computed values
  const activeDesign = designs.find((d) => d.is_active);
  const inactiveDesigns = designs.filter((d) => !d.is_active);
  const baseUrl = globalThis.window === undefined ? "" : globalThis.window.location.origin;
  const slug = currentBusiness?.url_slug || "";
  const fullUrl = `${baseUrl}/${slug}`;
  const showTemplatesSection = designs.length > 1 || !activeDesign;

  // Load designs
  const loadDesigns = useCallback(async () => {
    if (!currentBusiness?.id) return;
    try {
      const data = await getDesigns(currentBusiness.id);
      setDesigns(data);
    } catch (err) {
      console.error("Failed to load designs:", err);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  // Load settings from business
  useEffect(() => {
    if (currentBusiness?.settings?.customer_data_collection) {
      setSettings({
        collect_name: currentBusiness.settings.customer_data_collection.collect_name ?? false,
        collect_email: currentBusiness.settings.customer_data_collection.collect_email ?? false,
        collect_phone: currentBusiness.settings.customer_data_collection.collect_phone ?? false,
      });
    }
  }, [currentBusiness]);

  // Handlers
  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success(t('linkCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async (field: keyof DataCollectionSettings) => {
    if (!currentBusiness?.id) return;

    const newSettings = { ...settings, [field]: !settings[field] };
    setSettings(newSettings);
    setSaving(true);

    try {
      await updateBusiness(currentBusiness.id, {
        settings: {
          ...currentBusiness.settings,
          customer_data_collection: newSettings,
        },
      });
      await refetch();
    } catch (error) {
      console.error("Failed to update settings:", error);
      // Revert to previous settings on error
      setSettings((prev) => ({ ...prev, [field]: !prev[field] }));
      toast.error(t('toasts.settingsFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (designId: string) => {
    if (!currentBusiness?.id) return;
    if (!confirm(tDesign('deleteConfirm'))) return;

    try {
      await deleteDesign(currentBusiness.id, designId);
      await loadDesigns();
      toast.success(tDesign('toasts.cardDeleted'));
    } catch (error) {
      console.error("Failed to delete design:", error);
      toast.error(tDesign('toasts.deleteFailed'));
    }
  };

  const handleActivate = async (designId: string) => {
    if (!currentBusiness?.id) return;

    try {
      await activateDesign(currentBusiness.id, designId);
      await loadDesigns();
      toast.success(tDesign('toasts.cardActivated'));
    } catch (error) {
      console.error("Failed to activate design:", error);
      toast.error(tDesign('toasts.activateFailed'));
    }
  };

  const handleDuplicate = async (designId: string) => {
    if (!currentBusiness?.id) return;

    try {
      await duplicateDesign(currentBusiness.id, designId);
      await loadDesigns();
      toast.success(tDesign('toasts.cardDuplicated'));
    } catch (error) {
      console.error("Failed to duplicate design:", error);
      toast.error(tDesign('toasts.duplicateFailed'));
    }
  };

  const dataFields = [
    {
      key: "collect_name" as const,
      label: t('dataFields.name'),
      description: t('dataFields.nameDescription'),
      icon: UserIcon,
    },
    {
      key: "collect_email" as const,
      label: t('dataFields.email'),
      description: t('dataFields.emailDescription'),
      icon: EnvelopeIcon,
    },
    {
      key: "collect_phone" as const,
      label: t('dataFields.phone'),
      description: t('dataFields.phoneDescription'),
      icon: PhoneIcon,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        {!showTemplatesSection && (
          <Button asChild className="rounded-full">
            <Link href="/design/new">
              <PlusIcon className="w-4 h-4 mr-2" />
              {t('newCard')}
            </Link>
          </Button>
        )}
      </div>

      {/* Main content - Active Card + Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Card with tabs - shows first on mobile */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <Card className="h-full max-w-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('programSettings')}</CardTitle>
              <CardDescription>
                {t('configureProgram')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="url">
                <TabsList className="mb-4">
                  <TabsTrigger value="url">{t('businessUrl')}</TabsTrigger>
                  <TabsTrigger value="data">{t('dataCollection')}</TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{t('signupLink')}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="rounded-full"
                      >
                        {copied ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <CopyIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground break-all font-mono bg-background/50 p-2 rounded">
                      {fullUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <QrCodeIcon className="h-4 w-4" />
                    <span>{t('qrCodeHint')}</span>
                  </div>
                </TabsContent>

                <TabsContent value="data" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('dataCollectionDescription')}
                  </p>

                  {dataFields.map((field) => {
                    const Icon = field.icon;
                    return (
                      <div
                        key={field.key}
                        className="flex items-center justify-between p-4 border rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">{field.label}</Label>
                            <p className="text-xs text-muted-foreground">
                              {field.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={settings[field.key]}
                          onCheckedChange={() => handleToggle(field.key)}
                          disabled={saving}
                        />
                      </div>
                    );
                  })}

                  <p className="text-xs text-muted-foreground pt-2">
                    {t('anonymousModeNote')}
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Active Card - shows second on mobile, with max-width */}
        <div className="lg:col-span-1 order-2 lg:order-1 max-w-xs">
          <ActiveCardWidget design={activeDesign} isProPlan={true} />
        </div>
      </div>

      {/* Card Templates - only show when more than one card */}
      {showTemplatesSection && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('cardTemplates')}</h3>
            <Button asChild className="rounded-full">
              <Link href="/design/new">
                <PlusIcon className="w-4 h-4 mr-2" />
                {t('newCard')}
              </Link>
            </Button>
          </div>
          <TemplateGrid
            activeDesign={activeDesign}
            inactiveDesigns={inactiveDesigns}
            isProPlan={true}
            onDelete={handleDelete}
            onActivate={handleActivate}
            onDuplicate={handleDuplicate}
          />
        </div>
      )}
    </div>
  );
}
