import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every 30 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4">
      <div className="rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <RefreshCw className="h-5 w-5 mt-0.5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">Update Available</p>
            <p className="text-xs text-muted-foreground mt-1">
              A new version of Trestle is ready. Reload to get the latest features.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setNeedRefresh(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => updateServiceWorker(true)}
          >
            Reload Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNeedRefresh(false)}
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
