import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { usePluggy, PluggyAccount } from '@/hooks/usePluggy';
import { useCartoes } from '@/hooks/useCartoes';
import {
  Link,
  RefreshCw,
  CheckCircle2,
  Unplug,
  Zap,
  Clock,
  CreditCard,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PluggyConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCardId?: string;
}

interface AccountCardMapping {
  pluggyAccountId: string;
  creditCardId: string;
}

export function PluggyConnectDialog({ open, onOpenChange, preselectedCardId }: PluggyConnectDialogProps) {
  const { cartoes } = useCartoes();
  const { 
    pluggyItems, 
    getConnectToken, 
    getAccounts,
    linkMultipleItems,
    unlinkItem,
    syncCard, 
    isSyncing, 
    getCardPluggyItem 
  } = usePluggy();

  const [step, setStep] = useState<'overview' | 'mapping'>('overview');
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mapping step state
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [pendingConnectorName, setPendingConnectorName] = useState<string>('');
  const [pluggyAccounts, setPluggyAccounts] = useState<PluggyAccount[]>([]);
  const [mappings, setMappings] = useState<AccountCardMapping[]>([]);

  const linkedCards = cartoes?.filter(c => pluggyItems?.some(p => p.credit_card_id === c.id)) || [];
  const unlinkedCards = cartoes?.filter(c => !pluggyItems?.some(p => p.credit_card_id === c.id)) || [];

  useEffect(() => {
    if (!open) {
      setStep('overview');
      setPendingItemId(null);
      setPluggyAccounts([]);
      setMappings([]);
    }
  }, [open]);

  const handleStartConnect = async () => {
    setIsLoadingToken(true);
    try {
      const token = await getConnectToken();

      const pluggyUrl = `https://connect.pluggy.ai/?connect_token=${token}`;
      const popup = window.open(pluggyUrl, 'pluggy-connect', 'width=500,height=700,left=200,top=100');

      if (!popup) {
        toast.error('Não foi possível abrir o popup. Verifique se popups estão permitidos.');
        return;
      }

      let recovered = false;
      const openedAt = Date.now();
      const MIN_OPEN_TIME = 10000; // 10s - popup must stay open at least this long

      const doRecover = async () => {
        if (recovered) return;
        recovered = true;
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
        try { popup?.close(); } catch {}
        toast.info('Conexão detectada. Buscando dados...');
        await new Promise(r => setTimeout(r, 3000));
        await handleRecoverItems();
      };

      // Primary: listen for postMessage from Pluggy widget (strict origin check)
      const handleMessage = (event: MessageEvent) => {
        if (!event.origin?.includes('pluggy.ai')) return;
        if (
          event.data?.event === 'CONNECT_COMPLETED' ||
          event.data?.event === 'ITEM_CREATED' ||
          (event.data?.type === 'pluggy-connect' && event.data?.item)
        ) {
          doRecover();
        }
      };
      window.addEventListener('message', handleMessage);

      // Fallback: poll until popup closes, but only after minimum time
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          const elapsed = Date.now() - openedAt;
          if (elapsed < MIN_OPEN_TIME) {
            // Popup closed too fast - user cancelled or error
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            toast.warning('O popup foi fechado antes de completar a conexão. Tente novamente.');
            return;
          }
          doRecover();
        }
      }, 1000);
    } catch (error: any) {
      toast.error(`Erro ao conectar: ${error.message}`);
    } finally {
      setIsLoadingToken(false);
    }
  };

  // Recover unmapped items - first check DB for pending items saved by webhook,
  // then fallback to Pluggy API
  const handleRecoverItems = async () => {
    setIsRecovering(true);
    try {
      // First: check DB for pending items (saved by webhook when no mapping existed)
      const { data: pendingItems } = await supabase
        .from('pluggy_items')
        .select('*')
        .eq('status', 'PENDING_MAPPING')
        .is('credit_card_id', null)
        .order('created_at', { ascending: false });

      let itemToMap: { id: string; connectorName: string } | null = null;

      if (pendingItems && pendingItems.length > 0) {
        const pending = pendingItems[0];
        itemToMap = { 
          id: pending.pluggy_item_id, 
          connectorName: pending.connector_name || 'Instituição' 
        };
      } else {
        // Fallback: try API (may fail with 401 on some plans)
        try {
          const { data, error } = await supabase.functions.invoke('pluggy-auth', {
            body: { action: 'list-items' },
          });
          if (error) throw error;

          const items = data?.results || data || [];
          if (Array.isArray(items) && items.length > 0) {
            const mappedPluggyIds = new Set(pluggyItems?.map(p => p.pluggy_item_id) || []);
            const unmappedItems = items.filter((item: any) => !mappedPluggyIds.has(item.id));
            if (unmappedItems.length > 0) {
              const item = unmappedItems[0];
              itemToMap = { 
                id: item.id, 
                connectorName: item.connector?.name || item.connectorName || 'Instituição' 
              };
            }
          }
        } catch {
          // API failed, no pending items in DB either
        }
      }

      if (!itemToMap) {
        toast.info('Nenhuma conexão pendente encontrada. Aguarde alguns segundos e tente novamente.');
        return;
      }

      setPendingItemId(itemToMap.id);
      setPendingConnectorName(itemToMap.connectorName);
      setIsLoadingAccounts(true);

      const accounts = await getAccounts(itemToMap.id);
      const creditAccounts = accounts.filter((a: PluggyAccount) => a.type === 'CREDIT');

      if (creditAccounts.length === 0) {
        toast.error('Nenhum cartão de crédito encontrado nessa conexão.');
        return;
      }

      // Auto-map if 1 account and 1 unlinked card
      if (creditAccounts.length === 1 && unlinkedCards.length === 1) {
        await linkMultipleItems([{
          pluggyItemId: itemToMap.id,
          pluggyAccountId: creditAccounts[0].id,
          creditCardId: unlinkedCards[0].id,
          connectorName: itemToMap.connectorName,
        }]);
        // Clean up pending record
        await supabase.from('pluggy_items').delete().eq('pluggy_item_id', itemToMap.id).is('credit_card_id', null);
        toast.success('Cartão vinculado automaticamente!');
        return;
      }

      setPluggyAccounts(creditAccounts);
      setMappings(creditAccounts.map((a: PluggyAccount) => ({ pluggyAccountId: a.id, creditCardId: '' })));
      setStep('mapping');
    } catch (err: any) {
      toast.error(`Erro ao recuperar conexões: ${err.message}`);
    } finally {
      setIsRecovering(false);
      setIsLoadingAccounts(false);
    }
  };

  const updateMapping = (pluggyAccountId: string, creditCardId: string) => {
    setMappings(prev => prev.map(m => 
      m.pluggyAccountId === pluggyAccountId ? { ...m, creditCardId } : m
    ));
  };

  const handleSaveMappings = async () => {
    const validMappings = mappings.filter(m => m.creditCardId);
    if (validMappings.length === 0) {
      toast.error('Selecione ao menos um cartão para vincular.');
      return;
    }

    // Check for duplicate card selections
    const cardIds = validMappings.map(m => m.creditCardId);
    if (new Set(cardIds).size !== cardIds.length) {
      toast.error('Cada cartão só pode ser vinculado a uma conta.');
      return;
    }

    setIsSaving(true);
    try {
      await linkMultipleItems(
        validMappings.map(m => ({
          pluggyItemId: pendingItemId!,
          pluggyAccountId: m.pluggyAccountId,
          creditCardId: m.creditCardId,
          connectorName: pendingConnectorName,
        }))
      );
      // Clean up pending record from webhook
      await supabase.from('pluggy_items').delete().eq('pluggy_item_id', pendingItemId!).is('credit_card_id', null);
      setStep('overview');
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getAccountLabel = (account: PluggyAccount) => {
    const brand = account.creditData?.brand || '';
    const num = account.number ? `****${account.number.slice(-4)}` : '';
    return [account.name, brand, num].filter(Boolean).join(' · ');
  };

  // Cards available for mapping (unlinked ones)
  const availableCardsForMapping = unlinkedCards;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Pluggy - Open Finance
          </DialogTitle>
          <DialogDescription>
            {step === 'mapping' 
              ? 'Vincule cada conta da instituição ao cartão cadastrado no sistema.'
              : 'Conecte suas instituições via Open Finance para importar transações automaticamente.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'overview' && (
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
                            {pluggyItem?.connector_name && <span>{pluggyItem.connector_name}</span>}
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
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => syncCard(card.id)}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive"
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

            {/* Connect new institution - always show */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Conectar Instituição</h4>
              <p className="text-xs text-muted-foreground">
                Ao conectar um banco, todos os cartões de crédito dessa instituição serão detectados 
                e você poderá vinculá-los aos cartões já cadastrados.
              </p>
              {unlinkedCards.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Todos os cartões já estão vinculados. Para conectar outra instituição, 
                  cadastre o cartão primeiro na aba Cartões.
                </p>
              )}
              <Button
                className="w-full gap-2"
                onClick={handleStartConnect}
                disabled={isLoadingToken || isLoadingAccounts}
              >
                {isLoadingToken || isLoadingAccounts ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link className="h-4 w-4" />
                )}
                {isLoadingToken ? 'Carregando...' : isLoadingAccounts ? 'Buscando contas...' : 'Conectar via Open Finance'}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleRecoverItems}
                disabled={isRecovering || isLoadingAccounts}
              >
                {isRecovering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isRecovering ? 'Buscando...' : 'Recuperar conexões pendentes'}
              </Button>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p>• Uma conexão por banco pode trazer múltiplos cartões</p>
              <p>• Os dados são sincronizados automaticamente via webhook</p>
              <p>• O import manual continua funcionando como fallback</p>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">{pendingConnectorName || 'Instituição conectada'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {pluggyAccounts.length} cartão(ões) de crédito encontrado(s). 
                Vincule cada um ao cartão correspondente no sistema.
              </p>
            </div>

            <div className="space-y-4">
              {pluggyAccounts.map((account, idx) => {
                const currentMapping = mappings.find(m => m.pluggyAccountId === account.id);
                const selectedCardIds = mappings
                  .filter(m => m.pluggyAccountId !== account.id && m.creditCardId)
                  .map(m => m.creditCardId);

                return (
                  <div key={account.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{getAccountLabel(account)}</span>
                      </div>
                      {account.creditData?.creditLimit && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Limite: R$ {account.creditData.creditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

                    <Select 
                      value={currentMapping?.creditCardId || ''} 
                      onValueChange={(v) => updateMapping(account.id, v)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecionar cartão" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">— Não vincular</SelectItem>
                        {availableCardsForMapping
                          .filter(c => !selectedCardIds.includes(c.id))
                          .map(card => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.name} {card.last_digits ? `(****${card.last_digits})` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('overview')}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 gap-2" 
                onClick={handleSaveMappings}
                disabled={isSaving || !mappings.some(m => m.creditCardId && m.creditCardId !== 'skip')}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Vincular Cartões
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
