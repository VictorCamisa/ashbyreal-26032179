import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, AlertTriangle, Package, Filter, Trash2 } from 'lucide-react';
import { useEstoque, ProdutoEstoque } from '@/hooks/useEstoque';
import { EstoqueKPIs } from '@/components/estoque/EstoqueKPIs';
import { ImportarEstoqueDialog } from '@/components/estoque/ImportarEstoqueDialog';
import { NovoProdutoDialog } from '@/components/estoque/NovoProdutoDialog';
import { EditarProdutoDialog } from '@/components/estoque/EditarProdutoDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusColors: Record<string, string> = {
  disponivel: 'bg-primary/10 text-primary border-primary/20',
  baixo: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  esgotado: 'bg-destructive/10 text-destructive border-destructive/20',
};

const getStatusEstoque = (produto: ProdutoEstoque): 'disponivel' | 'baixo' | 'esgotado' => {
  if (produto.estoque === 0) return 'esgotado';
  if (produto.estoque <= produto.estoqueMinimo) return 'baixo';
  return 'disponivel';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    disponivel: 'Ok',
    baixo: 'Baixo',
    esgotado: 'Esgotado',
  };
  return labels[status] || status;
};

export default function Estoque() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'todos' | 'alerta'>('todos');
  const { produtos, isLoading, updateProduto, deleteProduto, refetch } = useEstoque();

  const categorias = ['todas', ...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  const filteredProdutos = produtos.filter(produto => {
    const matchSearch = 
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = categoriaFilter === 'todas' || produto.categoria === categoriaFilter;
    return matchSearch && matchCategoria && produto.ativo;
  });

  const produtosComAlerta = filteredProdutos.filter(p => getStatusEstoque(p) !== 'disponivel');
  const displayProdutos = activeTab === 'alerta' ? produtosComAlerta : filteredProdutos;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Estoque</h1>
            <p className="text-sm text-muted-foreground">Controle de produtos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ImportarEstoqueDialog onSuccess={refetch} />
          <NovoProdutoDialog onSuccess={refetch} />
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-muted/50 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <>
          <EstoqueKPIs produtos={produtos} />

          {/* Alert Banner */}
          {produtosComAlerta.length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-chart-4/5 border border-chart-4/20">
              <AlertTriangle className="h-4 w-4 text-chart-4" />
              <p className="text-sm">
                <strong>{produtosComAlerta.length}</strong> produto(s) requerem atenção
              </p>
            </div>
          )}

          {/* Tabs & Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border/50">
              <button
                onClick={() => setActiveTab('todos')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'todos' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Todos ({filteredProdutos.length})
              </button>
              <button
                onClick={() => setActiveTab('alerta')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'alerta' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Alertas ({produtosComAlerta.length})
              </button>
            </div>

            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-10 rounded-xl bg-muted/30 border-border/50"
                />
              </div>
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-[160px] h-10 rounded-xl bg-muted/30 border-border/50">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categorias.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'todas' ? 'Todas' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="font-medium">Produto</TableHead>
                  <TableHead className="font-medium">SKU</TableHead>
                  <TableHead className="font-medium">Estoque</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Custo</TableHead>
                  <TableHead className="font-medium">Venda</TableHead>
                  <TableHead className="font-medium">Margem</TableHead>
                  <TableHead className="font-medium text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProdutos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  displayProdutos.map((produto) => {
                    const status = getStatusEstoque(produto);
                    return (
                      <TableRow key={produto.id} className="border-border/30 hover:bg-muted/30">
                        <TableCell className="font-medium">{produto.nome}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {produto.sku || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{produto.estoque}</span>
                            <span className="text-xs text-muted-foreground">/ {produto.estoqueMinimo}</span>
                            {status !== 'disponivel' && (
                              <AlertTriangle className="h-3.5 w-3.5 text-chart-4" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[status]}>
                            {getStatusLabel(status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          R$ {produto.precoCusto.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium">
                          R$ {produto.preco.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {produto.margemLucro.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <EditarProdutoDialog produto={produto} onSave={updateProduto} />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteProduto(produto.id)}
                                    className="rounded-xl"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            {displayProdutos.length} de {produtos.filter(p => p.ativo).length} produtos
          </p>
        </>
      )}
    </div>
  );
}