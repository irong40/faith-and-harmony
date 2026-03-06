import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOSSafari() {
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /WebKit/.test(ua) && !/(CriOS|FxiOS|OPiOS|mercury)/.test(ua);
}

function isStandalone() {
  return ('standalone' in navigator && (navigator as any).standalone === true)
    || window.matchMedia('(display-mode: standalone)').matches;
}

export default function PWAInstallPrompt() {
  const { isPilot, user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show for authenticated pilots on the Trestle subdomain
    if (!user || !isPilot) return;
    if (!window.location.hostname.startsWith('trestle.')) return;
    if (isStandalone()) return;
    if (sessionStorage.getItem('trestle_install_dismissed')) {
      setDismissed(true);
      return;
    }

    if (isIOSSafari()) {
      setShowIOSGuide(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [user, isPilot]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIOSGuide(false);
    sessionStorage.setItem('trestle_install_dismissed', 'true');
  };

  if (dismissed) return null;
  if (!deferredPrompt && !showIOSGuide) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4">
      <div className="rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Download className="h-5 w-5 mt-0.5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">Install Trestle</p>
            {showIOSGuide ? (
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <p>To install, tap the <Share className="inline h-3 w-3 mb-0.5" /> Share button in Safari, then tap <strong>"Add to Home Screen"</strong>.</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Add Trestle to your home screen for quick access and offline support.
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {showIOSGuide ? (
          <div className="mt-3">
            <Button variant="outline" size="sm" className="w-full" onClick={handleDismiss}>
              Got it
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="flex-1" onClick={handleInstall}>
              Install
            </Button>
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              Not Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
