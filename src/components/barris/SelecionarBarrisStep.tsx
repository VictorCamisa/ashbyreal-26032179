import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Package, ArrowDown, ArrowUp, Droplet, AlertCircle, Store, ShieldCheck } from 'lucide-react';
import { useBarrisDisponiveis, useBarrisByCliente, useBarrisByLojista, Barril } from '@/hooks/useBarris';
import { cn } from '@/lib/utils';

interface SelecionarBarrisStepProps {
  clienteId?: string | null;
  lojistaId?: string | null;
  clienteNome: string;
  selectedEntrega: string[]; // IDs dos barris a entregar
  selectedRetorno: string[]; // IDs dos barris a retirar
  /** Barris da entrega que ficam como vasilhame consignado. */
  selectedConsignados: string[];
  onEntregaChange: (ids: string[]) => void;
  onRetornoChange: (ids: string[]) => void;
  onConsignadosChange: (ids: string[]) => void;
}

export function SelecionarBarrisStep({
  clienteId,
  lojistaId,
  clienteNome,
  selectedEntrega,
  selectedRetorno,
  selectedConsignados,
  onEntregaChange,
  onRetornoChange,
  onConsignadosChange,
}: SelecionarBarrisStepProps) {
  const { data: barrisDisponiveis = [], isLoading: loadingDisponiveis } = useBarrisDisponiveis();
  const { data: barrisCliente = [], isLoading: loadingCliente } = useBarrisByCliente(lojistaId ? null : clienteId);
  const { data: barrisLojista = [], isLoading: loadingLojista } = useBarrisByLojista(lojistaId);

  const isLojista = !!lojistaId;
  const barrisRetorno = isLojista ? barrisLojista : barrisCliente;
  const loadingRetorno = isLojista ? loadingLojista : loadingCliente;

  const toggleEntrega = (barrilId: string) => {
    if (selectedEntrega.includes(barrilId)) {
      onEntregaChange(selectedEntrega.filter(id => id !== barrilId));
      onConsignadosChange(selectedConsignados.filter(id => id !== barrilId));
    } else {
      onEntregaChange([...selectedEntrega, barrilId]);
    }
  };

  const toggleConsignado = (barrilId: string, consignado: boolean) => {
    if (consignado) onConsignadosChange([...selectedConsignados, barrilId]);
    else onConsignadosChange(selectedConsignados.filter(id => id !== barrilId));
  };

  const toggleRetorno = (barrilId: string) => {
    if (selectedRetorno.includes(barrilId)) {
      onRetornoChange(selectedRetorno.filter(id => id !== barrilId));
    } else {
      onRetornoChange([...selectedRetorno, barrilId]);
    }
  };

  const renderBarrilItem = (barril: Barril, isSelected: boolean, onToggle: () => void, entrega = false) => (
    <div
      key={barril.id}
      className={cn(
        'w-full rounded-xl border text-left transition-all',
        isSelected && 'border-primary bg-primary/5 ring-2 ring-primary/20'
      )}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-3 hover:bg-muted/30">
        <Checkbox checked={isSelected} className="pointer-events-none" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium">{barril.codigo}</span>
            <Badge variant="outline" className="text-xs">{barril.capacidade}L</Badge>
          </div>
        </div>
        <Badge 
          variant="outline"
          className={cn(
            "text-xs",
            barril.status_conteudo === 'CHEIO' 
              ? 'border-blue-500 text-blue-500' 
              : 'border-orange-500 text-orange-500'
          )}
        >
          <Droplet className="h-2.5 w-2.5 mr-1" />
          {barril.status_conteudo === 'CHEIO' ? 'Cheio' : 'Vazio'}
        </Badge>
      </button>
      {entrega && isSelected && (
        <div className="flex items-center justify-between border-t bg-background/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Vasilhame consignado</div>
          <Switch checked={selectedConsignados.includes(barril.id)} onCheckedChange={(checked) => toggleConsignado(barril.id, checked)} />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col bg-background">
      <div className="border-b bg-amber-500/5 px-4 py-3">
        <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/15">{isLojista ? <Store className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}</span>
          <div>
            <p className="text-sm font-semibold">Controle de barris</p>
            <p className="mt-0.5 text-xs opacity-80">Selecione os barris físicos e indique individualmente quais são consignados.</p>
          </div>
        </div>
      </div>

      <div className="grid max-h-[440px] min-h-[280px] grid-cols-1 overflow-hidden md:grid-cols-2">
        {/* Coluna Entregar */}
        <div className="flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
          <div className="border-b bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-primary">
              <ArrowDown className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Entregar (Cheios)</h3>
                <p className="text-xs text-muted-foreground">
                  Barris cheios da loja para {isLojista ? 'o lojista' : 'o cliente'}
                </p>
              </div>
            </div>
            {selectedEntrega.length > 0 && (
              <Badge className="mt-2">{selectedEntrega.length} selecionado(s)</Badge>
            )}
          </div>

          <ScrollArea className="min-h-0 flex-1 p-4">
            {loadingDisponiveis ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando barris...
              </div>
            ) : barrisDisponiveis.length > 0 ? (
              <div className="space-y-2">
                {barrisDisponiveis.map((barril) => 
                  renderBarrilItem(
                    barril, 
                    selectedEntrega.includes(barril.id),
                    () => toggleEntrega(barril.id)
                  , true)
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum barril cheio disponível na loja</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Coluna Retirar */}
        <div className="flex min-h-0 flex-col">
          <div className="border-b bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <ArrowUp className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Retirar (Vazios)</h3>
                <p className="text-xs text-muted-foreground">
                  Barris vazios {isLojista ? 'do lojista' : 'do cliente'} para a loja
                </p>
              </div>
            </div>
            {selectedRetorno.length > 0 && (
              <Badge variant="secondary" className="mt-2">{selectedRetorno.length} selecionado(s)</Badge>
            )}
          </div>

          <ScrollArea className="min-h-0 flex-1 p-4">
            {loadingRetorno ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando barris...
              </div>
            ) : barrisRetorno.length > 0 ? (
              <div className="space-y-2">
                {barrisRetorno.map((barril) => 
                  renderBarrilItem(
                    barril, 
                    selectedRetorno.includes(barril.id),
                    () => toggleRetorno(barril.id)
                  )
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>{isLojista ? 'Lojista' : 'Cliente'} não possui barris</p>
                <p className="text-xs mt-1">Nenhum barril registrado com {clienteNome}</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-primary" />
            <span><strong>{selectedEntrega.length}</strong> para entregar</span>
          </div>
          {selectedConsignados.length > 0 && <><Separator orientation="vertical" className="h-4" /><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><span><strong>{selectedConsignados.length}</strong> consignado(s)</span></div></>}
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-orange-500" />
            <span><strong>{selectedRetorno.length}</strong> para retirar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
