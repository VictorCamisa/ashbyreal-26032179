import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, AlertTriangle, Package, Filter } from 'lucide-react';
import { useEstoque, ProdutoEstoque } from '@/hooks/useEstoque';
import { EstoqueKPIs } from '@/components/estoque/EstoqueKPIs';
import { ImportarEstoqueDialog } from '@/components/estoque/ImportarEstoqueDialog';
import { NovoProdutoDialog } from '@/components/estoque/NovoProdutoDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusColors = {
  disponivel: 'bg-green-500',
  baixo: 'bg-yellow-500',
  esgotado: 'bg-red-500',
};

const getStatusEstoque = (produto: ProdutoEstoque): 'disponivel' | 'baixo' | 'esgotado' => {
  if (produto.estoque === 0) return 'esgotado';
  if (produto.estoque <= produto.estoqueMinimo) return 'baixo';
  return 'disponivel';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    disponivel: 'Disponível',
    baixo: 'Estoque Baixo',
    esgotado: 'Esgotado',
  };
  return labels[status] || status;
};

export default function Estoque() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const { produtos, isLoading, refetch } = useEstoque();

  const categorias = ['todas', ...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  const filteredProdutos = produtos.filter(produto => {
    const matchSearch = 
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.categoria?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCategoria = categoriaFilter === 'todas' || produto.categoria === categoriaFilter;
    
    const status = getStatusEstoque(produto);
    const matchStatus = statusFilter === 'todos' || status === statusFilter;
    
    return matchSearch && matchCategoria && matchStatus && produto.ativo;
  });

  const produtosComAlerta = filteredProdutos.filter(
    p => getStatusEstoque(p) !== 'disponivel'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Estoque</h1>
          <p className="text-muted-foreground">Controle completo de produtos e inventário</p>
        </div>
        <div className="flex gap-2">
          <ImportarEstoqueDialog onSuccess={refetch} />
          <NovoProdutoDialog onSuccess={refetch} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <EstoqueKPIs produtos={produtos} />

          {produtosComAlerta.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm">
                <strong>{produtosComAlerta.length}</strong> produto(s) requerem atenção no estoque
              </p>
            </div>
          )}

          <Tabs defaultValue="todos" className="space-y-4">
            <TabsList>
              <TabsTrigger value="todos">
                Todos ({filteredProdutos.length})
              </TabsTrigger>
              <TabsTrigger value="alerta">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Com Alerta ({produtosComAlerta.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, SKU ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat === 'todas' ? 'Todas as categorias' : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Package className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="baixo">Estoque Baixo</SelectItem>
                    <SelectItem value="esgotado">Esgotado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="todos" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Venda</TableHead>
                      <TableHead>Margem</TableHead>
                      <TableHead>Localização</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Nenhum produto encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProdutos.map((produto) => {
                        const status = getStatusEstoque(produto);
                        return (
                          <TableRow key={produto.id}>
                            <TableCell className="font-medium">{produto.nome}</TableCell>
                            <TableCell className="font-mono text-sm">{produto.sku || '-'}</TableCell>
                            <TableCell>{produto.categoria || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{produto.estoque}</span>
                                <span className="text-xs text-muted-foreground">
                                  / {produto.estoqueMinimo} mín
                                </span>
                                {status !== 'disponivel' && (
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[status]}>
                                {getStatusLabel(status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              R$ {produto.precoCusto.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-semibold">
                              R$ {produto.preco.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {produto.margemLucro.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {produto.localizacao || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>Mostrando {filteredProdutos.length} de {produtos.filter(p => p.ativo).length} produtos</p>
              </div>
            </TabsContent>

            <TabsContent value="alerta" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ação Necessária</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosComAlerta.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum produto com alerta de estoque</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      produtosComAlerta.map((produto) => {
                        const status = getStatusEstoque(produto);
                        const faltam = produto.estoqueMinimo - produto.estoque;
                        return (
                          <TableRow key={produto.id}>
                            <TableCell className="font-medium">{produto.nome}</TableCell>
                            <TableCell className="font-mono text-sm">{produto.sku || '-'}</TableCell>
                            <TableCell>{produto.categoria || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-yellow-600">{produto.estoque}</span>
                                <span className="text-xs text-muted-foreground">
                                  / {produto.estoqueMinimo} mín
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[status]}>
                                {getStatusLabel(status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {status === 'esgotado' ? (
                                <span className="text-sm text-red-600 font-medium">
                                  Repor urgente
                                </span>
                              ) : (
                                <span className="text-sm text-yellow-600">
                                  Repor {faltam} unidades
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
