'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface ViewerBannerProps {
  className?: string;
}

export function ViewerBanner({ className }: ViewerBannerProps) {
  return (
    <Alert className={className} variant="default">
      <InfoIcon className="h-4 w-4" />
      <AlertDescription>
        You have viewer access to this program. Contact your engagement lead to request edit access.
      </AlertDescription>
    </Alert>
  );
}
