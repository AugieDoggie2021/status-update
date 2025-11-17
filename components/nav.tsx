'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { SignOutButton } from './SignOutButton';
import { ImpersonationBanner } from './ImpersonationBanner';
import { useTheme } from './ThemeProvider';
import Image from 'next/image';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

type NavItem = {
  href: string;
  label: string;
  requiresWrite?: boolean;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/update', label: 'Update', requiresWrite: true },
  { href: '/admin/deleted', label: 'Admin', requiresWrite: true },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Nav() {
  const pathname = usePathname();
  const theme = useTheme();
  
  const { data: roleData } = useSWR<{ ok: boolean; role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null }>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const role = roleData?.role || null;
  const isOwner = role === 'OWNER';
  const canWrite = role === 'OWNER' || role === 'CONTRIBUTOR';

  // Get theme values with defaults
  const appName = theme?.app_name || 'Status Tracker';
  const logoUrl = theme?.logo_url;

  return (
    <>
      <ImpersonationBanner />
      <nav className="border-b backdrop-blur-xl bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b-slate-200/50 dark:border-b-slate-700/50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <div className="relative h-8 w-8 flex-shrink-0">
                <Image
                  src={logoUrl}
                  alt={`${appName} logo`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            <h1 
              className="text-2xl font-display font-bold tracking-tight bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to bottom right, hsl(var(--theme-primary)), hsl(var(--theme-secondary)))`,
              }}
            >
              {appName}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              // Hide items that require write access if user is viewer
              if (item.requiresWrite && !canWrite) {
                return null;
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-all',
                    pathname === item.href
                      ? 'text-slate-900 dark:text-slate-100 border'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-accent/50 hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                  style={pathname === item.href ? {
                    background: `linear-gradient(to right, hsl(var(--theme-primary) / 0.2), hsl(var(--theme-secondary) / 0.2))`,
                    borderColor: `hsl(var(--theme-primary) / 0.3)`,
                  } : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
            {isOwner && (
              <Link
                href="/admin/members"
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-all',
                  pathname === '/admin/members'
                    ? 'text-slate-900 dark:text-slate-100 border'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-accent/50 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                style={pathname === '/admin/members' ? {
                  background: `linear-gradient(to right, hsl(var(--theme-primary) / 0.2), hsl(var(--theme-secondary) / 0.2))`,
                  borderColor: `hsl(var(--theme-primary) / 0.3)`,
                } : undefined}
              >
                Members
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}

