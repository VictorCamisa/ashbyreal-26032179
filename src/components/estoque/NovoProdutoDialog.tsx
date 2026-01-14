import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Beer, Package, Droplets } from 'lucide-react';
import { useEstoque } from '@/hooks/useEstoque';
import { cn } from '@/lib/utils';

interface NovoProdutoDialogProps {
  onSuccess?: () => void;
}

type TipoProduto = 'PADRAO' | 'CHOPP';

export function NovoProdutoDialog({ onSuccess }: NovoProdutoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { createProduto } = useEstoque();
  
  const [tipoProduto, setTipoProduto] = useState<TipoProduto>('PADRAO');
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    sku: '',
    categoria: '',
    estoque: '0',
    estoqueMinimo: '10',
    preco: '',
    precoCusto: '',
    unidadeMedida: 'UN',
    fornecedor: '',
    localizacao: '',
    // Campos específicos para CHOPP
    estoqueLitros: '0',
    estoqueMinLitros: '100',
    capacidadeBarril: '30',
  });

  // Calcular preço por litro automaticamente
  const precoVenda = parseFloat(formData.preco) || 0;
  const capacidade = parseInt(formData.capacidadeBarril) || 30;
  const precoPorLitro = capacidade > 0 ? precoVenda / capacidade : 0;

  // Calcular equivalente em barris
  const estoqueLitros = parseFloat(formData.estoqueLitros) || 0;
  const equivalenteBarris = capacidade > 0 ? Math.floor(estoqueLitros / capacidade) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createProduto({
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        sku: formData.sku || undefined,
        categoria: tipoProduto === 'CHOPP' ? 'Chopp' : (formData.categoria || undefined),
        estoque: tipoProduto === 'CHOPP' ? 0 : parseInt(formData.estoque),
        estoqueMinimo: tipoProduto === 'CHOPP' 
          ? Math.ceil(parseFloat(formData.estoqueMinLitros) / capacidade) 
          : parseInt(formData.estoqueMinimo),
        preco: parseFloat(formData.preco),
        precoCusto: parseFloat(formData.precoCusto),
        unidadeMedida: tipoProduto === 'CHOPP' ? 'L' : formData.unidadeMedida,
        fornecedor: formData.fornecedor || undefined,
        localizacao: formData.localizacao || undefined,
        // Campos específicos para CHOPP
        tipoProduto,
        estoqueLitros: tipoProduto === 'CHOPP' ? parseFloat(formData.estoqueLitros) : 0,
        capacidadeBarril: tipoProduto === 'CHOPP' ? parseInt(formData.capacidadeBarril) : undefined,
      });

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
    setFormData({
      nome: '',
      descricao: '',
      sku: '',
      categoria: '',
      estoque: '0',
      estoqueMinimo: '10',
      preco: '',
      precoCusto: '',
      unidadeMedida: 'UN',
      fornecedor: '',
      localizacao: '',
      estoqueLitros: '0',
      estoqueMinLitros: '100',
      capacidadeBarril: '30',
    });
    setTipoProduto('PADRAO');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Produto</DialogTitle>
        </DialogHeader>
        
        {/* Tipo de Produto */}
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => setTipoProduto('PADRAO')}
            className={cn(
              "flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
              tipoProduto === 'PADRAO' 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <Package className={cn("h-6 w-6", tipoProduto === 'PADRAO' ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("font-medium", tipoProduto === 'PADRAO' ? "text-foreground" : "text-muted-foreground")}>
              Produto Padrão
            </span>
            <span className="text-xs text-muted-foreground">Estoque em unidades</span>
          </button>
          <button
            type="button"
            onClick={() => setTipoProduto('CHOPP')}
            className={cn(
              "flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
              tipoProduto === 'CHOPP' 
                ? "border-amber-500 bg-amber-500/5" 
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <Beer className={cn("h-6 w-6", tipoProduto === 'CHOPP' ? "text-amber-500" : "text-muted-foreground")} />
            <span className={cn("font-medium", tipoProduto === 'CHOPP' ? "text-foreground" : "text-muted-foreground")}>
              Chopp
            </span>
            <span className="text-xs text-muted-foreground">Estoque em litros</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome">Nome do Produto *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder={tipoProduto === 'CHOPP' ? 'Ex: Pilsen Ashby' : 'Ex: Copo Personalizado'}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="sku">SKU/Código</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder={tipoProduto === 'CHOPP' ? 'Ex: CHOPP-PILSEN' : 'Ex: PROD-001'}
              />
            </div>

            {tipoProduto === 'PADRAO' && (
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ex: Merchandising"
                />
              </div>
            )}

            {tipoProduto === 'CHOPP' && (
              <div>
                <Label htmlFor="capacidadeBarril">Capacidade do Barril</Label>
                <Select 
                  value={formData.capacidadeBarril} 
                  onValueChange={(v) => setFormData({ ...formData, capacidadeBarril: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Litros</SelectItem>
                    <SelectItem value="50">50 Litros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Estoque - Diferente para cada tipo */}
            {tipoProduto === 'PADRAO' ? (
              <>
                <div>
                  <Label htmlFor="estoque">Estoque Atual *</Label>
                  <Input
                    id="estoque"
                    type="number"
                    value={formData.estoque}
                    onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="estoqueMinimo">Estoque Mínimo *</Label>
                  <Input
                    id="estoqueMinimo"
                    type="number"
                    value={formData.estoqueMinimo}
                    onChange={(e) => setFormData({ ...formData, estoqueMinimo: e.target.value })}
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Droplets className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-800 dark:text-amber-400">Controle de Estoque em Litros</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estoqueLitros">Estoque Atual (L) *</Label>
                      <Input
                        id="estoqueLitros"
                        type="number"
                        step="0.1"
                        value={formData.estoqueLitros}
                        onChange={(e) => setFormData({ ...formData, estoqueLitros: e.target.value })}
                        required
                      />
                      {estoqueLitros > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          ≈ {equivalenteBarris} barris de {capacidade}L
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="estoqueMinLitros">Estoque Mínimo (L) *</Label>
                      <Input
                        id="estoqueMinLitros"
                        type="number"
                        step="0.1"
                        value={formData.estoqueMinLitros}
                        onChange={(e) => setFormData({ ...formData, estoqueMinLitros: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="precoCusto">
                {tipoProduto === 'CHOPP' ? `Custo por Barril ${capacidade}L (R$) *` : 'Preço de Custo (R$) *'}
              </Label>
              <Input
                id="precoCusto"
                type="number"
                step="0.01"
                value={formData.precoCusto}
                onChange={(e) => setFormData({ ...formData, precoCusto: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="preco">
                {tipoProduto === 'CHOPP' ? `Venda por Barril ${capacidade}L (R$) *` : 'Preço de Venda (R$) *'}
              </Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                required
              />
              {tipoProduto === 'CHOPP' && precoVenda > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {precoPorLitro.toFixed(2)}/litro
                </p>
              )}
            </div>

            {tipoProduto === 'PADRAO' && (
              <>
                <div>
                  <Label htmlFor="unidadeMedida">Unidade</Label>
                  <Input
                    id="unidadeMedida"
                    value={formData.unidadeMedida}
                    onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                    placeholder="Ex: UN, KG, L"
                  />
                </div>

                <div>
                  <Label htmlFor="localizacao">Localização</Label>
                  <Input
                    id="localizacao"
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    placeholder="Ex: Prateleira A1"
                  />
                </div>
              </>
            )}

            <div className={tipoProduto === 'CHOPP' ? 'col-span-2' : ''}>
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input
                id="fornecedor"
                value={formData.fornecedor}
                onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                placeholder={tipoProduto === 'CHOPP' ? 'Ex: Ashby' : ''}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Adicionar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
