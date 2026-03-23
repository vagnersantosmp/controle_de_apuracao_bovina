import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-card rounded-xl border shadow-sm">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {this.props.fallbackTitle || 'Algo deu errado'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Ocorreu um erro inesperado ao carregar este componente. Tente novamente ou recarregue a página.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-xs text-destructive bg-destructive/5 rounded p-3 mb-4 max-w-lg overflow-auto text-left">
              {this.state.error.message}
            </pre>
          )}
          <Button variant="outline" onClick={this.handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
