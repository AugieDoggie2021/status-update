"use client";

import { useImpersonation, stopImpersonating } from '@/lib/client/impersonate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedRole } = useImpersonation();

  if (!isImpersonating) {
    return null;
  }

  const handleStop = async () => {
    try {
      await stopImpersonating();
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
    }
  };

  return (
    <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 mb-4">
      <AlertDescription className="flex items-center justify-between">
        <span className="font-medium">
          🎭 Impersonating as <strong>{impersonatedRole}</strong>
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          className="ml-4"
        >
          <X className="h-4 w-4 mr-1" />
          Stop Impersonating
        </Button>
      </AlertDescription>
    </Alert>
  );
}

