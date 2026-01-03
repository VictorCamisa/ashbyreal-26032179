import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, Package, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDevolucaoMutations, DevolucaoItem } from '@/hooks/useDevolucaoMutations';

interface PedidoItem {
  id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  quantidade_devolvida: number;
  produtos: {
    nome: string;
  } | null;
}

interface RegistrarDevolucaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  onSuccess?: () => void;
}

export function RegistrarDevolucaoDialog({
  open,
  onOpenChange,
  pedidoId,
  onSuccess
}: RegistrarDevolucaoDialogProps) {
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [devolucoes, setDevolucoes] = useState<Record<string, number>>({});
  const [observacoes, setObservacoes] = useState('');
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const { isLoading, registrarDevolucao } = useDevolucaoMutations();

  useEffect(() => {
    if (open && pedidoId) {
      fetchItems();
    }
  }, [open, pedidoId]);

  const fetchItems = async () => {
    setIsLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('pedido_itens')
        .select(`
          id,
          produto_id,
          quantidade,
          preco_unitario,
          quantidade_devolvida,
          produtos (nome)
        `)
        .eq('pedido_id', pedidoId);

      if (error) throw error;
      setItems(data || []);
      
      // Initialize devolucoes state
      const initialDevolucoes: Record<string, number> = {};
      (data || []).forEach(item => {
        initialDevolucoes[item.id] = 0;
      });
      setDevolucoes(initialDevolucoes);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleQuantityChange = (itemId: string, value: string, max: number) => {
    const numValue = parseInt(value) || 0;
    setDevolucoes(prev => ({
      ...prev,
      [itemId]: Math.min(Math.max(0, numValue), max)
    }));
  };

  const getTotalEstorno = () => {
    return items.reduce((total, item) => {
      const qtdDevolver = devolucoes[item.id] || 0;
      return total + (qtdDevolver * item.preco_unitario);
    }, 0);
  };

  const hasItemsToReturn = () => {
    return Object.values(devolucoes).some(qty => qty > 0);
  };

  const handleSubmit = async () => {
    const itemsToReturn: DevolucaoItem[] = items
      .filter(item => (devolucoes[item.id] || 0) > 0)
      .map(item => ({
        itemId: item.id,
        produtoId: item.produto_id,
        nomeProduto: item.produtos?.nome || 'Produto',
        quantidadeOriginal: item.quantidade,
        quantidadeJaDevolvida: item.quantidade_devolvida || 0,
        quantidadeDevolver: devolucoes[item.id] || 0,
        precoUnitario: item.preco_unitario
      }));

    try {
      await registrarDevolucao(pedidoId, itemsToReturn, observacoes);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleClose = () => {
    setDevolucoes({});
    setObservacoes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-500" />
            Registrar Devolução
          </DialogTitle>
          <DialogDescription>
            Selecione os itens que o cliente está devolvendo (consignado).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoadingItems ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando itens...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum item encontrado neste pedido.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const maxDevolver = item.quantidade - (item.quantidade_devolvida || 0);
                const jaDevolvido = item.quantidade_devolvida || 0;
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {item.produtos?.nome || 'Produto'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {item.quantidade}x - R$ {item.preco_unitario.toFixed(2)}/un
                        {jaDevolvido > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {jaDevolvido} já devolvido
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {maxDevolver > 0 ? (
                        <>
                          <Label className="text-xs text-muted-foreground">Devolver:</Label>
                          <Input
                            type="number"
                            min={0}
                            max={maxDevolver}
                            value={devolucoes[item.id] || 0}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value, maxDevolver)}
                            className="w-16 h-8 text-center"
                          />
                          <span className="text-xs text-muted-foreground">
                            /{maxDevolver}
                          </span>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Todo devolvido
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Motivo da devolução, estado do produto, etc."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>

          {hasItemsToReturn() && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Total a estornar:</span>
              </div>
              <span className="text-lg font-bold text-amber-600">
                R$ {getTotalEstorno().toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasItemsToReturn() || isLoading}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isLoading ? 'Processando...' : 'Confirmar Devolução'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
