'use client';

import { useEffect } from 'react';
import useSWR from 'swr';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Theme {
  logo_url: string | null;
  app_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

interface ThemeResponse {
  ok: boolean;
  theme: Theme;
}

/**
 * Converts hex color to HSL format for CSS variables
 * Returns HSL string without hsl() wrapper: "142 76% 36%"
 */
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${h} ${s}% ${lPercent}%`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data, error } = useSWR<ThemeResponse>(
    PROGRAM_ID ? `/api/theme?programId=${PROGRAM_ID}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  useEffect(() => {
    if (!data?.ok || error) {
      // Use defaults if theme fetch fails
      return;
    }

    const theme = data.theme;

    // Convert hex colors to HSL and set CSS variables
    const root = document.documentElement;
    
    if (theme.primary_color) {
      root.style.setProperty('--theme-primary', hexToHsl(theme.primary_color));
    }
    if (theme.secondary_color) {
      root.style.setProperty('--theme-secondary', hexToHsl(theme.secondary_color));
    }
    if (theme.accent_color) {
      root.style.setProperty('--theme-accent', hexToHsl(theme.accent_color));
    }

    // Store theme data for components to access
    root.style.setProperty('--theme-app-name', `"${theme.app_name}"`);
    if (theme.logo_url) {
      root.style.setProperty('--theme-logo-url', `url("${theme.logo_url}")`);
    } else {
      root.style.removeProperty('--theme-logo-url');
    }
  }, [data, error]);

  return <>{children}</>;
}

/**
 * Hook to access theme data
 */
export function useTheme(): Theme | null {
  const { data } = useSWR<ThemeResponse>(
    PROGRAM_ID ? `/api/theme?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  return data?.ok ? data.theme : null;
}

