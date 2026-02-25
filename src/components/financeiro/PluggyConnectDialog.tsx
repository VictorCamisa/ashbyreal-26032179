import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePluggy } from '@/hooks/usePluggy';
import { useCartoes } from '@/hooks/useCartoes';
import {
  Link,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Unplug,
  Zap,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PluggyConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCardId?: string;
}

export function PluggyConnectDialog({ open, onOpenChange, preselectedCardId }: PluggyConnectDialogProps) {
  const { cartoes } = useCartoes();
  const { 
    pluggyItems, 
    getConnectToken, 
    linkItem, 
    isLinking,
    unlinkItem,
    syncCard, 
    isSyncing, 
    getCardPluggyItem 
  } = usePluggy();

  const [selectedCardId, setSelectedCardId] = useState<string>(preselectedCardId || '');
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [step, setStep] = useState<'select' | 'connect' | 'done'>('select');

  useEffect(() => {
    if (preselectedCardId) {
      setSelectedCardId(preselectedCardId);
    }
  }, [preselectedCardId]);

  const linkedCards = cartoes?.filter(c => pluggyItems?.some(p => p.credit_card_id === c.id)) || [];
  const unlinkedCards = cartoes?.filter(c => !pluggyItems?.some(p => p.credit_card_id === c.id)) || [];

  const handleStartConnect = async () => {
    if (!selectedCardId) return;

    setIsLoadingToken(true);
    try {
      const token = await getConnectToken();
      setConnectToken(token);
      setStep('connect');

      // Open Pluggy Connect widget in new window
      const pluggyUrl = `https://connect.pluggy.ai/?connect_token=${token}`;
      const popup = window.open(pluggyUrl, 'pluggy-connect', 'width=500,height=700,left=200,top=100');

      // Listen for messages from Pluggy Connect
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'pluggy-connect' && event.data?.item) {
          const item = event.data.item;
          linkItem({
            pluggyItemId: item.id,
            creditCardId: selectedCardId,
            connectorName: item.connector?.name,
          });
          setStep('done');
          window.removeEventListener('message', handleMessage);
          popup?.close();
        }
      };

      window.addEventListener('message', handleMessage);

      // Also check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          if (step === 'connect') {
            setStep('select');
          }
        }
      }, 1000);

    } catch (error: any) {
      console.error('Error getting connect token:', error);
    } finally {
      setIsLoadingToken(false);
    }
  };

  const handleManualLink = () => {
    // For cases where the popup flow doesn't work, allow manual item ID input
    const itemId = prompt('Cole o Item ID da Pluggy:');
    if (itemId && selectedCardId) {
      linkItem({
        pluggyItemId: itemId,
        creditCardId: selectedCardId,
      });
      setStep('done');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Pluggy - Open Finance
          </DialogTitle>
          <DialogDescription>
            Conecte seus cartões via Open Finance para importar transações automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Already linked cards */}
          {linkedCards.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Cartões Conectados</h4>
              {linkedCards.map(card => {
                const pluggyItem = getCardPluggyItem(card.id);
                return (
                  <div key={card.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{card.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {pluggyItem?.connector_name && (
                            <span>{pluggyItem.connector_name}</span>
                          )}
                          {pluggyItem?.last_sync_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(pluggyItem.last_sync_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={pluggyItem?.last_sync_status === 'SUCCESS' ? 'default' : 'destructive'} className="text-xs">
                        {pluggyItem?.last_sync_status === 'SUCCESS' ? 'OK' : pluggyItem?.last_sync_status || '—'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => syncCard(card.id)}
                        disabled={isSyncing}
                      >
                        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => pluggyItem && unlinkItem(pluggyItem.id)}
                      >
                        <Unplug className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Connect new card */}
          {unlinkedCards.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Conectar Cartão</h4>
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cartão" />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedCards.map(card => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} {card.last_digits ? `(****${card.last_digits})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={handleStartConnect}
                  disabled={!selectedCardId || isLoadingToken || isLinking}
                >
                  <Link className="h-4 w-4" />
                  {isLoadingToken ? 'Carregando...' : 'Conectar via Open Finance'}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={handleManualLink}
                disabled={!selectedCardId}
              >
                Vincular manualmente (Item ID)
              </Button>
            </div>
          )}

          {unlinkedCards.length === 0 && linkedCards.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Todos os cartões já estão conectados! 🎉
            </p>
          )}

          {/* Info */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p>• Os dados são sincronizados automaticamente via webhook</p>
            <p>• Você pode forçar uma sincronização manual a qualquer momento</p>
            <p>• O import manual continua funcionando como fallback</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
