import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useEstoque } from '@/hooks/useEstoque';

interface NovoProdutoDialogProps {
  onSuccess?: () => void;
}

export function NovoProdutoDialog({ onSuccess }: NovoProdutoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { createProduto } = useEstoque();
  
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createProduto({
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        sku: formData.sku || undefined,
        categoria: formData.categoria || undefined,
        estoque: parseInt(formData.estoque),
        estoqueMinimo: parseInt(formData.estoqueMinimo),
        preco: parseFloat(formData.preco),
        precoCusto: parseFloat(formData.precoCusto),
        unidadeMedida: formData.unidadeMedida,
        fornecedor: formData.fornecedor || undefined,
        localizacao: formData.localizacao || undefined,
      });

      setOpen(false);
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
      });
      onSuccess?.();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome">Nome do Produto *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
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
                placeholder="Ex: PROD-001"
              />
            </div>

            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                placeholder="Ex: Eletrônicos"
              />
            </div>

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

            <div>
              <Label htmlFor="precoCusto">Preço de Custo (R$) *</Label>
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
              <Label htmlFor="preco">Preço de Venda (R$) *</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                required
              />
            </div>

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

            <div className="col-span-2">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input
                id="fornecedor"
                value={formData.fornecedor}
                onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
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
