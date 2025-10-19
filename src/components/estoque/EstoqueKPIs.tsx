import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { ProdutoEstoque } from '@/hooks/useEstoque';

interface EstoqueKPIsProps {
  produtos: ProdutoEstoque[];
}

export function EstoqueKPIs({ produtos }: EstoqueKPIsProps) {
  const totalProdutos = produtos.length;
  const produtosAtivos = produtos.filter(p => p.ativo).length;
  
  const produtosBaixoEstoque = produtos.filter(
    p => p.ativo && p.estoque <= p.estoqueMinimo && p.estoque > 0
  ).length;
  
  const produtosEsgotados = produtos.filter(
    p => p.ativo && p.estoque === 0
  ).length;
  
  const valorTotalEstoque = produtos
    .filter(p => p.ativo)
    .reduce((acc, p) => acc + (p.preco * p.estoque), 0);
  
  const margemMediaLucro = produtos.filter(p => p.ativo && p.margemLucro > 0).length > 0
    ? produtos
        .filter(p => p.ativo && p.margemLucro > 0)
        .reduce((acc, p) => acc + p.margemLucro, 0) / 
      produtos.filter(p => p.ativo && p.margemLucro > 0).length
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{produtosAtivos}</div>
          <p className="text-xs text-muted-foreground">
            {totalProdutos} no total ({totalProdutos - produtosAtivos} inativos)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas de Estoque</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {produtosBaixoEstoque + produtosEsgotados}
          </div>
          <p className="text-xs text-muted-foreground">
            {produtosBaixoEstoque} baixo • {produtosEsgotados} esgotados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            Valor total no estoque
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {margemMediaLucro.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Lucro médio dos produtos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
