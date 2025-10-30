'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase-client';
import { LogOut } from 'lucide-react';
import { Button } from './ui/button';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/risks', label: 'Risks' },
  { href: '/actions', label: 'Actions' },
  { href: '/report', label: 'Report' },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Nav() {
  const pathname = usePathname();
  const supabase = createClient();
  
  const { data: roleData } = useSWR<{ ok: boolean; role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null }>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    fetcher
  );

  const isOwner = roleData?.role === 'OWNER';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/sign-in';
  };

  return (
    <nav className="border-b backdrop-blur-xl bg-white/50 dark:bg-slate-900/40 border-b-white/20">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <h1 className="text-2xl font-display font-bold tracking-tight bg-gradient-to-br from-emerald-600 to-sky-600 bg-clip-text text-transparent">
            Advisory Status Tracker
          </h1>
          <div className="flex items-center space-x-2">
            {navItems.map((item) => (
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
            ))}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="ml-2"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

