import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

// -------------------------------------------------------
// Error Boundary — catches rendering errors in child tree
// -------------------------------------------------------

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught rendering error:", error, info);
    // Best-effort activity event — ignore failures
    try {
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase.from("activity_events").insert({
          event_type: "app_error",
          entity_type: "error",
          summary: `UI error: ${error.message.slice(0, 200)}`,
          metadata: { componentStack: info.componentStack?.slice(0, 500) },
        });
      });
    } catch {
      // Silently ignore — logging is best-effort
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <RouteErrorFallback onReset={this.handleReset} error={this.state.error} />;
    }
    return this.props.children;
  }
}

// -------------------------------------------------------
// Default error fallback UI
// -------------------------------------------------------
interface RouteErrorFallbackProps {
  onReset?: () => void;
  error?: Error | null;
}

export function RouteErrorFallback({ onReset, error }: RouteErrorFallbackProps) {
  const handleReset = onReset ?? (() => window.location.reload());
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          This page encountered an unexpected error. Reloading should fix it.
          {error && (
            <span className="block mt-2 font-mono text-xs bg-muted p-2 rounded text-left break-all">
              {error.message}
            </span>
          )}
        </p>
        <Button onClick={handleReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reload Page
        </Button>
      </div>
    </div>
  );
}
