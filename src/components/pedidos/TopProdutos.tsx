import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PedidoItem {
  id: string;
  produtoId: string;
  quantidade: number;
  subtotal: number;
  precoUnitario: number;
  produto?: {
    nome?: string;
    categoria?: string;
  };
}

interface TopProdutosProps {
  items: PedidoItem[];
}

export function TopProdutos({ items }: TopProdutosProps) {
  const ranking = useMemo(() => {
    const produtoStats: Record<
      string,
      { nome: string; categoria: string; quantidade: number; total: number }
    > = {};

    items.forEach((item) => {
      const key = item.produtoId;
      if (!produtoStats[key]) {
        produtoStats[key] = {
          nome: item.produto?.nome || 'Produto',
          categoria: item.produto?.categoria || 'Outros',
          quantidade: 0,
          total: 0,
        };
      }
      produtoStats[key].quantidade += item.quantidade;
      produtoStats[key].total += item.subtotal;
    });

    return Object.entries(produtoStats)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [items]);

  const maxTotal = ranking[0]?.total || 1;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Top Produtos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {ranking.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Sem dados de produtos
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="divide-y">
              {ranking.map((produto, index) => (
                <div
                  key={produto.id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm font-medium text-muted-foreground w-5">
                        #{index + 1}
                      </span>
                      <p className="font-medium truncate">{produto.nome}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                      {produto.categoria}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(produto.total / maxTotal) * 100}%` }}
                      />
                    </div>
                    <div className="text-right shrink-0 w-28">
                      <p className="text-sm font-bold text-primary">
                        R$ {produto.total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {produto.quantidade} vendidos
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
