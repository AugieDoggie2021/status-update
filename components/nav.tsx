'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { SignOutButton } from './SignOutButton';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/status-update', label: 'Status Update', requiresWrite: true },
  { href: '/workstreams', label: 'Workstreams' },
  { href: '/risks', label: 'Risks' },
  { href: '/actions', label: 'Actions' },
  { href: '/report', label: 'Report' },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Nav() {
  const pathname = usePathname();
  
  const { data: roleData } = useSWR<{ ok: boolean; role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null }>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const role = roleData?.role || null;
  const isOwner = role === 'OWNER';
  const canWrite = role === 'OWNER' || role === 'CONTRIBUTOR';

  return (
    <nav className="border-b backdrop-blur-xl bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b-slate-200/50 dark:border-b-slate-700/50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <h1 className="text-2xl font-display font-bold tracking-tight bg-gradient-to-br from-emerald-600 to-sky-600 bg-clip-text text-transparent">
            Status Tracker
          </h1>
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
                      ? 'bg-gradient-to-r from-emerald-500/20 to-sky-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                  )}
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
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                )}
              >
                Members
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

