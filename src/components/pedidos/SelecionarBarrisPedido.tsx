import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X, Search, ArrowDown, ArrowUp, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BarrilDisponivel {
  id: string;
  codigo: string;
  capacidade: number;
  status_conteudo: 'CHEIO' | 'VAZIO';
  localizacao: 'FABRICA' | 'LOJA' | 'CLIENTE';
  cliente_id: string | null;
}

interface BarrilSelecionado {
  id: string;
  codigo: string;
  capacidade: number;
}

interface SelecionarBarrisPedidoProps {
  clienteId: string | null;
  barrisEntrega: BarrilSelecionado[];
  barrisRetorno: BarrilSelecionado[];
  onBarrisEntregaChange: (barris: BarrilSelecionado[]) => void;
  onBarrisRetornoChange: (barris: BarrilSelecionado[]) => void;
  disabled?: boolean;
}

export function SelecionarBarrisPedido({
  clienteId,
  barrisEntrega,
  barrisRetorno,
  onBarrisEntregaChange,
  onBarrisRetornoChange,
  disabled = false,
}: SelecionarBarrisPedidoProps) {
  const [barrisDisponiveis, setBarrisDisponiveis] = useState<BarrilDisponivel[]>([]);
  const [barrisDoCliente, setBarrisDoCliente] = useState<BarrilDisponivel[]>([]);
  const [searchEntrega, setSearchEntrega] = useState('');
  const [searchRetorno, setSearchRetorno] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Buscar barris disponíveis na loja (cheios) para entrega
  useEffect(() => {
    const fetchBarris = async () => {
      setIsLoading(true);
      try {
        // Barris cheios na loja para entrega
        const { data: disponiveis } = await supabase
          .from('barris')
          .select('id, codigo, capacidade, status_conteudo, localizacao, cliente_id')
          .eq('localizacao', 'LOJA')
          .eq('status_conteudo', 'CHEIO')
          .is('cliente_id', null)
          .is('lojista_id', null)
          .order('codigo');

        setBarrisDisponiveis(disponiveis || []);

        // Barris no cliente para retorno
        if (clienteId) {
          const { data: doCliente } = await supabase
            .from('barris')
            .select('id, codigo, capacidade, status_conteudo, localizacao, cliente_id')
            .eq('localizacao', 'CLIENTE')
            .eq('cliente_id', clienteId)
            .order('codigo');

          setBarrisDoCliente(doCliente || []);
        }
      } catch (error) {
        console.error('Erro ao buscar barris:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBarris();
  }, [clienteId]);

  const addBarrilEntrega = (barril: BarrilDisponivel) => {
    if (barrisEntrega.some(b => b.id === barril.id)) return;
    onBarrisEntregaChange([...barrisEntrega, {
      id: barril.id,
      codigo: barril.codigo,
      capacidade: barril.capacidade,
    }]);
  };

  const removeBarrilEntrega = (barrilId: string) => {
    onBarrisEntregaChange(barrisEntrega.filter(b => b.id !== barrilId));
  };

  const addBarrilRetorno = (barril: BarrilDisponivel) => {
    if (barrisRetorno.some(b => b.id === barril.id)) return;
    onBarrisRetornoChange([...barrisRetorno, {
      id: barril.id,
      codigo: barril.codigo,
      capacidade: barril.capacidade,
    }]);
  };

  const removeBarrilRetorno = (barrilId: string) => {
    onBarrisRetornoChange(barrisRetorno.filter(b => b.id !== barrilId));
  };

  const filteredEntrega = barrisDisponiveis.filter(b =>
    b.codigo.toLowerCase().includes(searchEntrega.toLowerCase()) &&
    !barrisEntrega.some(sel => sel.id === b.id)
  );

  const filteredRetorno = barrisDoCliente.filter(b =>
    b.codigo.toLowerCase().includes(searchRetorno.toLowerCase()) &&
    !barrisRetorno.some(sel => sel.id === b.id)
  );

  return (
    <div className="space-y-4">
      {/* Barris para Entrega (Saída) */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUp className="h-4 w-4 text-emerald-500" />
          <Label className="font-semibold text-sm">Barris para Entrega (Cheios)</Label>
          <Badge variant="outline" className="ml-auto">
            {barrisEntrega.length} selecionado(s)
          </Badge>
        </div>

        {/* Barris Selecionados */}
        {barrisEntrega.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {barrisEntrega.map(barril => (
              <Badge
                key={barril.id}
                variant="secondary"
                className="gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
              >
                <Package className="h-3 w-3" />
                {barril.codigo} ({barril.capacidade}L)
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeBarrilEntrega(barril.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Busca e Lista */}
        {!disabled && (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar barril por código..."
                value={searchEntrega}
                onChange={(e) => setSearchEntrega(e.target.value)}
                className="h-7 pl-7 text-xs"
              />
            </div>

            {filteredEntrega.length > 0 ? (
              <ScrollArea className="h-24">
                <div className="flex flex-wrap gap-1">
                  {filteredEntrega.map(barril => (
                    <Button
                      key={barril.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      onClick={() => addBarrilEntrega(barril)}
                    >
                      <Plus className="h-3 w-3" />
                      {barril.codigo} ({barril.capacidade}L)
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                {isLoading ? 'Carregando...' : 'Nenhum barril cheio disponível na loja'}
              </p>
            )}
          </>
        )}
      </div>

      {/* Barris para Retorno (Entrada) */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <ArrowDown className="h-4 w-4 text-amber-500" />
          <Label className="font-semibold text-sm">Barris para Retirar (Vazios)</Label>
          <Badge variant="outline" className="ml-auto">
            {barrisRetorno.length} selecionado(s)
          </Badge>
        </div>

        {/* Barris Selecionados */}
        {barrisRetorno.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {barrisRetorno.map(barril => (
              <Badge
                key={barril.id}
                variant="secondary"
                className="gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              >
                <Package className="h-3 w-3" />
                {barril.codigo} ({barril.capacidade}L)
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeBarrilRetorno(barril.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Busca e Lista */}
        {!disabled && clienteId && (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar barril por código..."
                value={searchRetorno}
                onChange={(e) => setSearchRetorno(e.target.value)}
                className="h-7 pl-7 text-xs"
              />
            </div>

            {filteredRetorno.length > 0 ? (
              <ScrollArea className="h-24">
                <div className="flex flex-wrap gap-1">
                  {filteredRetorno.map(barril => (
                    <Button
                      key={barril.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-6 text-xs gap-1",
                        barril.status_conteudo === 'VAZIO' 
                          ? "border-amber-300" 
                          : "border-emerald-300"
                      )}
                      onClick={() => addBarrilRetorno(barril)}
                    >
                      <Plus className="h-3 w-3" />
                      {barril.codigo} ({barril.capacidade}L)
                      <Badge variant="outline" className="ml-1 h-4 text-[10px]">
                        {barril.status_conteudo === 'CHEIO' ? 'C' : 'V'}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                {!clienteId 
                  ? 'Selecione um cliente para ver os barris' 
                  : isLoading 
                  ? 'Carregando...' 
                  : 'Nenhum barril com este cliente'}
              </p>
            )}
          </>
        )}

        {!clienteId && !disabled && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Selecione um cliente para ver os barris disponíveis para retirada
          </p>
        )}
      </div>
    </div>
  );
}
