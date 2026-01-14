import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Beer, Droplets } from 'lucide-react';
import { useEstoque, ProdutoEstoque } from '@/hooks/useEstoque';
import { cn } from '@/lib/utils';

interface EntradaChoppDialogProps {
  onSuccess?: () => void;
}

type ModoEntrada = 'litros' | 'barris';

export function EntradaChoppDialog({ onSuccess }: EntradaChoppDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { produtos, registrarEntradaChopp } = useEstoque();
  
  const [produtoId, setProdutoId] = useState<string>('');
  const [modoEntrada, setModoEntrada] = useState<ModoEntrada>('barris');
  const [quantidadeLitros, setQuantidadeLitros] = useState('');
  const [quantidadeBarris, setQuantidadeBarris] = useState('');
  const [capacidadeBarril, setCapacidadeBarril] = useState('30');
  const [observacoes, setObservacoes] = useState('');

  // Filtrar apenas produtos tipo CHOPP
  const produtosChopp = produtos.filter(p => p.tipoProduto === 'CHOPP' && p.ativo);

  // Produto selecionado
  const produtoSelecionado = produtosChopp.find(p => p.id === produtoId);

  // Calcular litros baseado no modo
  const litrosCalculados = modoEntrada === 'litros' 
    ? parseFloat(quantidadeLitros) || 0
    : (parseInt(quantidadeBarris) || 0) * (parseInt(capacidadeBarril) || 30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoId || litrosCalculados <= 0) return;
    
    setIsLoading(true);

    try {
      await registrarEntradaChopp(
        produtoId, 
        litrosCalculados, 
        observacoes || `Entrada: ${modoEntrada === 'barris' ? `${quantidadeBarris} barris de ${capacidadeBarril} LITROS` : `${quantidadeLitros} LITROS`}`
      );

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setProdutoId('');
    setModoEntrada('barris');
    setQuantidadeLitros('');
    setQuantidadeBarris('');
    setCapacidadeBarril('30');
    setObservacoes('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Beer className="h-4 w-4" />
          Entrada de Chopp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beer className="h-5 w-5 text-amber-500" />
            Registrar Entrada de Chopp
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção do Produto */}
          <div>
            <Label>Produto *</Label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o chopp" />
              </SelectTrigger>
              <SelectContent>
                {produtosChopp.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum produto de chopp cadastrado.
                    <br />
                    Cadastre um produto tipo "Chopp" primeiro.
                  </div>
                ) : (
                  produtosChopp.map(produto => (
                    <SelectItem key={produto.id} value={produto.id}>
                      <div className="flex items-center gap-2">
                        <span>{produto.nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {produto.estoqueLitros} LITROS
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Modo de Entrada */}
          <div>
            <Label className="mb-2 block">Como deseja informar?</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModoEntrada('barris')}
                className={cn(
                  "flex-1 p-3 rounded-lg border transition-all flex items-center justify-center gap-2",
                  modoEntrada === 'barris' 
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" 
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <Beer className={cn("h-4 w-4", modoEntrada === 'barris' ? "text-amber-600" : "text-muted-foreground")} />
                <span className={modoEntrada === 'barris' ? "font-medium" : "text-muted-foreground"}>
                  Barris
                </span>
              </button>
              <button
                type="button"
                onClick={() => setModoEntrada('litros')}
                className={cn(
                  "flex-1 p-3 rounded-lg border transition-all flex items-center justify-center gap-2",
                  modoEntrada === 'litros' 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <Droplets className={cn("h-4 w-4", modoEntrada === 'litros' ? "text-blue-600" : "text-muted-foreground")} />
                <span className={modoEntrada === 'litros' ? "font-medium" : "text-muted-foreground"}>
                  Litros
                </span>
              </button>
            </div>
          </div>

          {/* Campos de quantidade */}
          {modoEntrada === 'barris' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quantidadeBarris">Quantidade de Barris *</Label>
                <Input
                  id="quantidadeBarris"
                  type="number"
                  min="1"
                  value={quantidadeBarris}
                  onChange={(e) => setQuantidadeBarris(e.target.value)}
                  placeholder="Ex: 10"
                  required
                />
              </div>
              <div>
                <Label htmlFor="capacidadeBarril">Capacidade</Label>
                <Select value={capacidadeBarril} onValueChange={setCapacidadeBarril}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Litros</SelectItem>
                    <SelectItem value="50">50 Litros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="quantidadeLitros">Quantidade em Litros *</Label>
              <Input
                id="quantidadeLitros"
                type="number"
                step="0.1"
                min="0.1"
                value={quantidadeLitros}
                onChange={(e) => setQuantidadeLitros(e.target.value)}
                placeholder="Ex: 500"
                required
              />
            </div>
          )}

          {/* Resumo */}
          {litrosCalculados > 0 && produtoSelecionado && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Será adicionado ao estoque</p>
                <p className="text-2xl font-bold text-emerald-600">+{litrosCalculados} LITROS</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Estoque atual: {produtoSelecionado.estoqueLitros} LITROS → 
                  Novo: {produtoSelecionado.estoqueLitros + litrosCalculados} LITROS
                </p>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Pedido Ashby #123"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !produtoId || litrosCalculados <= 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
