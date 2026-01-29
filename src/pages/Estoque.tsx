import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, AlertTriangle, Package, Filter, Trash2, Box, DollarSign, Beer, Droplets } from 'lucide-react';
import { useEstoque, ProdutoEstoque } from '@/hooks/useEstoque';
import { ImportarEstoqueDialog } from '@/components/estoque/ImportarEstoqueDialog';
import { NovoProdutoDialog } from '@/components/estoque/NovoProdutoDialog';
import { EditarProdutoDialog } from '@/components/estoque/EditarProdutoDialog';
import { EntradaChoppDialog } from '@/components/estoque/EntradaChoppDialog';
import { PageLayout } from '@/components/layout/PageLayout';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
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
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  disponivel: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  baixo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  esgotado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  sempre_disponivel: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
};

const getStatusEstoque = (produto: ProdutoEstoque): 'disponivel' | 'baixo' | 'esgotado' | 'sempre_disponivel' => {
  if (produto.tipoProduto === 'CHOPP') {
    return 'sempre_disponivel';
  }
  if (produto.estoque === 0) return 'esgotado';
  if (produto.estoque <= produto.estoqueMinimo) return 'baixo';
  return 'disponivel';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    disponivel: 'Ok',
    baixo: 'Baixo',
    esgotado: 'Esgotado',
    sempre_disponivel: 'Sob Demanda',
  };
  return labels[status] || status;
};

export default function Estoque() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'todos' | 'alerta'>('todos');
  const { produtos, isLoading, updateProduto, deleteProduto, refetch } = useEstoque();

  const categorias = ['todas', ...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  const filteredProdutos = produtos.filter(produto => {
    const matchSearch = 
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = categoriaFilter === 'todas' || produto.categoria === categoriaFilter;
    const matchTipo = tipoFilter === 'todos' || produto.tipoProduto === tipoFilter;
    return matchSearch && matchCategoria && matchTipo && produto.ativo;
  });

  const produtosComAlerta = filteredProdutos.filter(p => getStatusEstoque(p) !== 'disponivel');
  const displayProdutos = activeTab === 'alerta' ? produtosComAlerta : filteredProdutos;

  const produtosChopp = produtos.filter(p => p.tipoProduto === 'CHOPP' && p.ativo);
  const produtosPadrao = produtos.filter(p => p.tipoProduto !== 'CHOPP' && p.ativo);
  
  const totalLitrosChopp = produtosChopp.reduce((acc, p) => acc + p.estoqueLitros, 0);
  const totalValue = produtosPadrao.reduce((acc, p) => acc + (p.estoque * p.precoCusto), 0) +
                     produtosChopp.reduce((acc, p) => acc + (p.estoqueLitros * (p.precoCusto / (p.capacidadeBarril || 30))), 0);

  return (
    <PageLayout
      title="Estoque"
      subtitle="Controle de produtos e inventário"
      icon={Package}
      actions={
        <div className="flex gap-2">
          <EntradaChoppDialog onSuccess={refetch} />
          <ImportarEstoqueDialog onSuccess={refetch} />
          <NovoProdutoDialog onSuccess={refetch} />
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <KPIGrid>
            <KPICard label="Total Produtos" value={produtos.filter(p => p.ativo).length} icon={Box} />
            <KPICard 
              label="Chopp Disponível" 
              value={`${totalLitrosChopp.toLocaleString('pt-BR')} LITROS`} 
              icon={Beer}
            />
            <KPICard label="Em Alerta" value={produtosComAlerta.length} icon={AlertTriangle} variant="warning" />
            <KPICard label="Valor Estoque" value={`R$ ${(totalValue / 1000).toFixed(0)}k`} icon={DollarSign} />
          </KPIGrid>

          {/* Alert Banner */}
          {produtosComAlerta.length > 0 && (
            <Card className="border-warning/50 bg-warning/10">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <p className="text-sm">
                  <strong>{produtosComAlerta.length}</strong> produto(s) requerem atenção
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tabs & Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit">
              <button
                onClick={() => setActiveTab('todos')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  activeTab === 'todos' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Todos ({filteredProdutos.length})
              </button>
              <button
                onClick={() => setActiveTab('alerta')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  activeTab === 'alerta' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
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
                  className="pl-11 h-10 rounded-xl"
                />
              </div>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-[130px] h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="CHOPP">
                    <span className="flex items-center gap-2">
                      <Beer className="h-3.5 w-3.5" />
                      Chopp
                    </span>
                  </SelectItem>
                  <SelectItem value="PADRAO">
                    <span className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5" />
                      Padrão
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-[160px] h-10 rounded-xl">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
          <Card className="overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium">Produto</TableHead>
                    <TableHead className="font-medium">Tipo</TableHead>
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
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-10 w-10 text-muted-foreground/30" />
                          <p className="text-muted-foreground">Nenhum produto encontrado</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayProdutos.map((produto) => {
                      const status = getStatusEstoque(produto);
                      const isChopp = produto.tipoProduto === 'CHOPP';
                      const capacidade = produto.capacidadeBarril || 30;
                      
                      return (
                        <TableRow key={produto.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div>
                              <p className="font-medium">{produto.nome}</p>
                              <p className="text-xs text-muted-foreground">{produto.sku || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isChopp ? (
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                <Beer className="h-3 w-3 mr-1" />
                                {capacidade} LITROS
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Padrão
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isChopp ? (
                              <div className="flex flex-col">
                                <span className="font-medium flex items-center gap-1">
                                  <Droplets className="h-3 w-3 text-primary" />
                                  {produto.estoqueLitros.toLocaleString('pt-BR')} LITROS
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ≈ {Math.floor(produto.estoqueLitros / capacidade)} barris
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{produto.estoque}</span>
                                <span className="text-xs text-muted-foreground">/ {produto.estoqueMinimo}</span>
                                {status !== 'disponivel' && (
                                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[status]}>
                              {getStatusLabel(status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            R$ {produto.precoCusto.toFixed(2)}
                            {isChopp && (
                              <span className="block text-xs">
                                R$ {(produto.precoCusto / capacidade).toFixed(2)}/LITRO
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            R$ {produto.preco.toFixed(2)}
                            {isChopp && (
                              <span className="block text-xs text-muted-foreground font-normal">
                                R$ {(produto.preco / capacidade).toFixed(2)}/LITRO
                              </span>
                            )}
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
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteProduto(produto.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            {displayProdutos.length} de {produtos.filter(p => p.ativo).length} produtos
          </p>
        </div>
      )}
    </PageLayout>
  );
}