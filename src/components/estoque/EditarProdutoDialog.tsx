import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pencil, Beer, Package, Droplets } from 'lucide-react';
import { ProdutoEstoque } from '@/hooks/useEstoque';
import { cn } from '@/lib/utils';

interface EditarProdutoDialogProps {
  produto: ProdutoEstoque;
  onSave: (id: string, updates: Partial<ProdutoEstoque>) => Promise<void>;
}

export function EditarProdutoDialog({ produto, onSave }: EditarProdutoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ProdutoEstoque>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        nome: produto.nome,
        descricao: produto.descricao,
        sku: produto.sku,
        categoria: produto.categoria,
        estoque: produto.estoque,
        estoqueMinimo: produto.estoqueMinimo,
        preco: produto.preco,
        precoCusto: produto.precoCusto,
        unidadeMedida: produto.unidadeMedida,
        fornecedor: produto.fornecedor,
        localizacao: produto.localizacao,
        tipoProduto: produto.tipoProduto,
        estoqueLitros: produto.estoqueLitros,
        capacidadeBarril: produto.capacidadeBarril,
      });
    }
  }, [open, produto]);

  const isChopp = formData.tipoProduto === 'CHOPP';
  const capacidade = formData.capacidadeBarril || 30;
  const estoqueLitros = formData.estoqueLitros || 0;
  const equivalenteBarris = capacidade > 0 ? Math.floor(estoqueLitros / capacidade) : 0;
  const precoPorLitro = capacidade > 0 && formData.preco ? formData.preco / capacidade : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(produto.id, formData);
      setOpen(false);
    } catch (error) {
      console.error('Erro ao editar produto:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isChopp ? <Beer className="h-5 w-5 text-amber-500" /> : <Package className="h-5 w-5" />}
            Editar {isChopp ? 'Chopp' : 'Produto'}
          </DialogTitle>
          <DialogDescription>
            {isChopp ? 'Atualize as informações do chopp' : 'Atualize as informações do produto no estoque'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Indicador de tipo */}
            <div className="flex items-center gap-2">
              <Badge variant={isChopp ? 'default' : 'secondary'} className={cn(isChopp && "bg-amber-500")}>
                {isChopp ? 'Chopp' : 'Produto Padrão'}
              </Badge>
              {isChopp && (
                <span className="text-sm text-muted-foreground">
                  Barril {capacidade}L
                </span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nome">Nome do Produto *</Label>
              <Input
                id="nome"
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao || ''}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku || ''}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>

              {isChopp ? (
                <div className="grid gap-2">
                  <Label htmlFor="capacidadeBarril">Capacidade do Barril</Label>
                  <Select 
                    value={String(formData.capacidadeBarril || 30)} 
                    onValueChange={(v) => setFormData({ ...formData, capacidadeBarril: parseInt(v) })}
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
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria || ''}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Estoque - Diferente para cada tipo */}
            {isChopp ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <Droplets className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-400">Estoque em Litros</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="estoqueLitros">Estoque Atual (L)</Label>
                    <Input
                      id="estoqueLitros"
                      type="number"
                      step="0.1"
                      value={formData.estoqueLitros || 0}
                      onChange={(e) => setFormData({ ...formData, estoqueLitros: parseFloat(e.target.value) })}
                    />
                    {estoqueLitros > 0 && (
                      <p className="text-xs text-amber-600">
                        ≈ {equivalenteBarris} barris de {capacidade}L
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="estoqueMinimo">Estoque Mínimo (barris)</Label>
                    <Input
                      id="estoqueMinimo"
                      type="number"
                      min="0"
                      value={formData.estoqueMinimo || 0}
                      onChange={(e) => setFormData({ ...formData, estoqueMinimo: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="estoque">Estoque Atual *</Label>
                  <Input
                    id="estoque"
                    type="number"
                    min="0"
                    value={formData.estoque || 0}
                    onChange={(e) => setFormData({ ...formData, estoque: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="estoqueMinimo">Estoque Mínimo *</Label>
                  <Input
                    id="estoqueMinimo"
                    type="number"
                    min="0"
                    value={formData.estoqueMinimo || 0}
                    onChange={(e) => setFormData({ ...formData, estoqueMinimo: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="unidadeMedida">Unidade de Medida</Label>
                  <Input
                    id="unidadeMedida"
                    value={formData.unidadeMedida || ''}
                    onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                    placeholder="UN, KG, L, etc."
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="precoCusto">
                  {isChopp ? `Custo por Barril ${capacidade}L *` : 'Preço de Custo *'}
                </Label>
                <Input
                  id="precoCusto"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precoCusto || 0}
                  onChange={(e) => setFormData({ ...formData, precoCusto: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="preco">
                  {isChopp ? `Venda por Barril ${capacidade}L *` : 'Preço de Venda *'}
                </Label>
                <Input
                  id="preco"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.preco || 0}
                  onChange={(e) => setFormData({ ...formData, preco: Number(e.target.value) })}
                  required
                />
                {isChopp && formData.preco && formData.preco > 0 && (
                  <p className="text-xs text-muted-foreground">
                    R$ {precoPorLitro.toFixed(2)}/litro
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input
                  id="fornecedor"
                  value={formData.fornecedor || ''}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                />
              </div>

              {!isChopp && (
                <div className="grid gap-2">
                  <Label htmlFor="localizacao">Localização</Label>
                  <Input
                    id="localizacao"
                    value={formData.localizacao || ''}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    placeholder="Ex: Prateleira A-1"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
