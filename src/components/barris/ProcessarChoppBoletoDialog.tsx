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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Package, RefreshCw, Plus, Factory, Store, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBarrisMutations } from '@/hooks/useBarrisMutations';
import { supabase } from '@/integrations/supabase/client';

interface ChoppItem {
  descricao: string;
  quantidade: number;
  capacidade: number; // litros do barril (30, 50, etc)
}

interface ProcessarChoppBoletoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ChoppItem[];
  onProcessed?: () => void;
}

export function ProcessarChoppBoletoDialog({
  open,
  onOpenChange,
  items,
  onProcessed
}: ProcessarChoppBoletoDialogProps) {
  const [modo, setModo] = useState<'criar' | 'encher'>('encher');
  const [fabricaSelecionada, setFabricaSelecionada] = useState<'DATTA_VALE' | 'ASHBY'>('DATTA_VALE');
  const [barrisVaziosDisponiveis, setBarrisVaziosDisponiveis] = useState<Record<number, number>>({});
  const [isLoadingCheck, setIsLoadingCheck] = useState(false);
  const { processarEntradaChopp, isLoading } = useBarrisMutations();

  // Verificar quantos barris vazios estão disponíveis por capacidade
  useEffect(() => {
    if (!open || items.length === 0) return;

    const checkBarrisVazios = async () => {
      setIsLoadingCheck(true);
      const capacidades = [...new Set(items.map(i => i.capacidade))];
      const disponibilidade: Record<number, number> = {};

      for (const cap of capacidades) {
        const { count } = await supabase
          .from('barris')
          .select('id', { count: 'exact', head: true })
          .eq('localizacao', 'LOJA')
          .eq('status_conteudo', 'VAZIO')
          .eq('capacidade', cap);

        disponibilidade[cap] = count || 0;
      }

      setBarrisVaziosDisponiveis(disponibilidade);
      setIsLoadingCheck(false);
    };

    checkBarrisVazios();
  }, [open, items]);

  // Verificar se há barris vazios suficientes para todos os itens
  const temBarrisSuficientes = items.every(
    item => (barrisVaziosDisponiveis[item.capacidade] || 0) >= item.quantidade
  );

  const handleProcessar = async () => {
    try {
      for (const item of items) {
        await processarEntradaChopp(item.quantidade, item.capacidade, modo, fabricaSelecionada);
      }
      onOpenChange(false);
      onProcessed?.();
    } catch (error) {
      console.error('Erro ao processar chopp:', error);
    }
  };

  const totalBarris = items.reduce((acc, i) => acc + i.quantidade, 0);
  const totalLitros = items.reduce((acc, i) => acc + (i.quantidade * i.capacidade), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Entrada de Barris de Chopp
          </DialogTitle>
          <DialogDescription>
            Detectamos {totalBarris} barril(is) ({totalLitros}L) no boleto. Como deseja processar?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo dos itens */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <Label className="text-xs text-muted-foreground mb-2 block">Itens detectados:</Label>
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{item.descricao}</span>
                  <Badge variant="outline" className="ml-2">
                    {item.quantidade}x {item.capacidade}L
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-3">
            <Label>Como processar os barris?</Label>
            
            <RadioGroup value={modo} onValueChange={(v) => setModo(v as 'criar' | 'encher')}>
              {/* Opção Encher */}
              <div className="flex items-start space-x-3 border rounded-lg p-3 hover:bg-muted/30 cursor-pointer">
                <RadioGroupItem value="encher" id="encher" className="mt-1" />
                <label htmlFor="encher" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    Encher barris vazios existentes
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Usa barris vazios que já estão na loja (FIFO - mais antigos primeiro)
                  </p>
                  
                  {/* Status de disponibilidade */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {isLoadingCheck ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      items.map((item, idx) => {
                        const disponivel = barrisVaziosDisponiveis[item.capacidade] || 0;
                        const suficiente = disponivel >= item.quantidade;
                        return (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={suficiente ? 'border-emerald-500 text-emerald-600' : 'border-destructive text-destructive'}
                          >
                            {item.capacidade}L: {disponivel} vazios ({suficiente ? '✓' : `faltam ${item.quantidade - disponivel}`})
                          </Badge>
                        );
                      })
                    )}
                  </div>
                </label>
              </div>

              {/* Opção Criar */}
              <div className="flex items-start space-x-3 border rounded-lg p-3 hover:bg-muted/30 cursor-pointer">
                <RadioGroupItem value="criar" id="criar" className="mt-1" />
                <label htmlFor="criar" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Plus className="h-4 w-4 text-primary" />
                    Criar novos barris da fábrica
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cria {totalBarris} barril(is) novo(s) que vieram da fábrica
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Factory className="h-3.5 w-3.5" />
                    <span>→</span>
                    <Store className="h-3.5 w-3.5" />
                    <span>Barris cheios entram na loja</span>
                  </div>
                </label>
              </div>
            </RadioGroup>

            {/* Seleção de fábrica quando modo = criar */}
            {modo === 'criar' && (
              <div className="space-y-2 pl-7">
                <Label className="text-sm">De qual fábrica?</Label>
                <Select value={fabricaSelecionada} onValueChange={(v) => setFabricaSelecionada(v as 'DATTA_VALE' | 'ASHBY')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DATTA_VALE">
                      <span className="flex items-center gap-2">
                        <Factory className="h-4 w-4" /> Datta Vale
                      </span>
                    </SelectItem>
                    <SelectItem value="ASHBY">
                      <span className="flex items-center gap-2">
                        <Factory className="h-4 w-4" /> Ashby
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Aviso se não tem barris suficientes */}
            {modo === 'encher' && !temBarrisSuficientes && !isLoadingCheck && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Não há barris vazios suficientes. Você pode criar novos barris ou processar parcialmente.
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleProcessar} 
            disabled={isLoading || (modo === 'encher' && !temBarrisSuficientes)}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {modo === 'criar' ? `Criar ${totalBarris} barril(is)` : `Encher ${totalBarris} barril(is)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}