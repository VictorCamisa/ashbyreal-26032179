import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Package, ArrowDown, ArrowUp, Droplet, AlertCircle, Store } from 'lucide-react';
import { useBarrisDisponiveis, useBarrisByCliente, useBarrisByLojista, Barril } from '@/hooks/useBarris';
import { cn } from '@/lib/utils';

interface SelecionarBarrisStepProps {
  clienteId?: string | null;
  lojistaId?: string | null;
  clienteNome: string;
  selectedEntrega: string[]; // IDs dos barris a entregar
  selectedRetorno: string[]; // IDs dos barris a retirar
  onEntregaChange: (ids: string[]) => void;
  onRetornoChange: (ids: string[]) => void;
}

export function SelecionarBarrisStep({
  clienteId,
  lojistaId,
  clienteNome,
  selectedEntrega,
  selectedRetorno,
  onEntregaChange,
  onRetornoChange,
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
    } else {
      onEntregaChange([...selectedEntrega, barrilId]);
    }
  };

  const toggleRetorno = (barrilId: string) => {
    if (selectedRetorno.includes(barrilId)) {
      onRetornoChange(selectedRetorno.filter(id => id !== barrilId));
    } else {
      onRetornoChange([...selectedRetorno, barrilId]);
    }
  };

  const renderBarrilItem = (barril: Barril, isSelected: boolean, onToggle: () => void) => (
    <button
      key={barril.id}
      onClick={onToggle}
      className={cn(
        'w-full p-3 rounded-lg border text-left transition-all hover:border-primary/50',
        isSelected && 'border-primary bg-primary/5 ring-2 ring-primary/20'
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox checked={isSelected} />
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
      </div>
    </button>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/20">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          {isLojista ? <Store className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <div>
            <p className="font-medium">
              Gestão de Barris - {isLojista ? 'Lojista' : 'Cliente CNPJ'}
            </p>
            <p className="text-sm opacity-80">
              Selecione os barris que serão entregues e/ou retirados neste pedido
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Coluna Entregar */}
        <div className="flex-1 flex flex-col border-r">
          <div className="p-4 border-b bg-muted/30">
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

          <ScrollArea className="flex-1 p-4">
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
                  )
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
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b bg-muted/30">
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

          <ScrollArea className="flex-1 p-4">
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
      <div className="px-6 py-3 border-t bg-muted/20">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-primary" />
            <span><strong>{selectedEntrega.length}</strong> para entregar</span>
          </div>
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