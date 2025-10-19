import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, AlertTriangle, Package } from 'lucide-react';
import { mockProdutos } from '@/data/produtos.mock';
import { StatusEstoque } from '@/types/produto';

const getStatusEstoque = (disponivel: number, minimo: number): StatusEstoque => {
  if (disponivel === 0) return 'esgotado';
  if (disponivel <= minimo) return 'baixo';
  return 'disponivel';
};

const statusColors = {
  disponivel: 'bg-green-500',
  baixo: 'bg-yellow-500',
  esgotado: 'bg-red-500'
};

export default function Estoque() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProdutos = mockProdutos.filter(produto =>
    produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.codigoInterno.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const produtosBaixoEstoque = mockProdutos.filter(p => 
    getStatusEstoque(p.quantidadeDisponivel, p.quantidadeMinima) !== 'disponivel'
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">Controle Total de Produtos</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {produtosBaixoEstoque > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <p className="text-sm">
            <strong>{produtosBaixoEstoque}</strong> produto(s) com estoque baixo ou esgotado requerem atenção
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, categoria ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Preço Custo</TableHead>
              <TableHead>Preço Venda</TableHead>
              <TableHead>Margem</TableHead>
              <TableHead>Atualização</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProdutos.map((produto) => {
              const status = getStatusEstoque(produto.quantidadeDisponivel, produto.quantidadeMinima);
              return (
                <TableRow key={produto.id}>
                  <TableCell className="font-medium">{produto.nome}</TableCell>
                  <TableCell>{produto.categoria}</TableCell>
                  <TableCell className="font-mono text-sm">{produto.codigoInterno}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{produto.quantidadeDisponivel}</span>
                      {status !== 'disponivel' && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[status]}>
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell>R$ {produto.precoCusto.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">
                    R$ {produto.precoVenda.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-secondary">
                      {produto.margem.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(produto.ultimaAtualizacao).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Mostrando {filteredProdutos.length} de {mockProdutos.length} produtos</p>
      </div>
    </div>
  );
}
