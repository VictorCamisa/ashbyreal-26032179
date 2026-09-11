import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Falha ao renderizar a página:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4 border border-border rounded-xl bg-card p-6">
            <div className="flex justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Algo deu errado nesta tela</h2>
              <p className="text-sm text-muted-foreground">
                Tente novamente. Se continuar, mostre esta mensagem para o suporte.
              </p>
            </div>
            <pre className="text-xs text-left text-muted-foreground bg-muted rounded-md p-3 overflow-auto max-h-40 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => this.setState({ error: null })}>
                Tentar novamente
              </Button>
              <Button onClick={() => window.location.reload()}>Recarregar</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
