'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Palette } from 'lucide-react';
import { LogoUpload } from '@/components/LogoUpload';
import type { Role } from '@/lib/role';
import { useImpersonation } from '@/lib/client/impersonate';
import Image from 'next/image';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Theme {
  logo_url: string | null;
  app_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

export default function ThemePage() {
  const [appName, setAppName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [secondaryColor, setSecondaryColor] = useState('#0284c7');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: roleData } = useSWR<{ ok: boolean; role: Role | null }>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const { data: themeData, mutate: mutateTheme } = useSWR<{ ok: boolean; theme: Theme }>(
    PROGRAM_ID ? `/api/theme?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const { isImpersonating } = useImpersonation();
  const isOwner = roleData?.role === 'OWNER' || isImpersonating;

  // Initialize form with theme data
  useEffect(() => {
    if (themeData?.ok && themeData.theme) {
      setAppName(themeData.theme.app_name);
      setPrimaryColor(themeData.theme.primary_color);
      setSecondaryColor(themeData.theme.secondary_color);
      setAccentColor(themeData.theme.accent_color);
      setLogoUrl(themeData.theme.logo_url);
    }
  }, [themeData]);

  const handleSave = async () => {
    if (!appName.trim()) {
      toast.error('App name is required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/theme?programId=${PROGRAM_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: appName.trim(),
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save theme');
      }

      toast.success('Theme saved successfully');
      mutateTheme();
      // Trigger theme refresh by reloading page (ThemeProvider will pick up changes)
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save theme');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUploadSuccess = (newLogoUrl: string) => {
    setLogoUrl(newLogoUrl);
    mutateTheme();
    // Trigger theme refresh
    window.location.reload();
  };

  const handleLogoDeleteSuccess = () => {
    setLogoUrl(null);
    mutateTheme();
    // Trigger theme refresh
    window.location.reload();
  };

  // Check access
  if (!isOwner && !isImpersonating) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Access denied. Owner role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Theme Settings</h2>
        <p className="text-muted-foreground mt-1">Customize branding and colors for this program</p>
      </div>

      <Card className="backdrop-blur-xl bg-white/50 dark:bg-slate-900/40 border border-white/20 rounded-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding & Colors
          </CardTitle>
          <CardDescription>
            Configure the appearance of your program dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <LogoUpload
            currentLogoUrl={logoUrl}
            programId={PROGRAM_ID}
            onUploadSuccess={handleLogoUploadSuccess}
            onDeleteSuccess={handleLogoDeleteSuccess}
          />

          {/* App Name */}
          <div className="space-y-2">
            <Label htmlFor="app-name">App Name</Label>
            <Input
              id="app-name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Status Tracker"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              The name displayed in the navigation bar
            </p>
          </div>

          {/* Colors */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="primary-color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-20 rounded border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setPrimaryColor(value);
                    }
                  }}
                  placeholder="#10b981"
                  maxLength={7}
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Main brand color
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="secondary-color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-20 rounded border cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setSecondaryColor(value);
                    }
                  }}
                  placeholder="#0284c7"
                  maxLength={7}
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Secondary brand color
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="accent-color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-20 rounded border cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setAccentColor(value);
                    }
                  }}
                  placeholder="#10b981"
                  maxLength={7}
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Accent highlights
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <p className="text-sm font-medium mb-2">Preview</p>
            <div className="flex items-center gap-3">
              {logoUrl && (
                <div className="relative h-8 w-8 flex-shrink-0">
                  <Image
                    src={logoUrl}
                    alt="Logo preview"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              <h3
                className="text-xl font-display font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                {appName || 'Status Tracker'}
              </h3>
            </div>
            <div className="flex gap-2 mt-3">
              <div
                className="h-8 w-16 rounded"
                style={{ backgroundColor: primaryColor }}
              />
              <div
                className="h-8 w-16 rounded"
                style={{ backgroundColor: secondaryColor }}
              />
              <div
                className="h-8 w-16 rounded"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Theme'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

