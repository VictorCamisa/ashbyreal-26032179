import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Package, Tags, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankingItem {
  nome: string;
  valor?: number;
  quantidade?: number;
}

interface RankingsPanelProps {
  topClientes: RankingItem[];
  topProdutos: { nome: string; quantidade: number; valor: number }[];
  topCategorias: RankingItem[];
}

export function RankingsPanel({ topClientes, topProdutos, topCategorias }: RankingsPanelProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const medalColors = ['text-amber-500', 'text-slate-400', 'text-amber-700', 'text-muted-foreground', 'text-muted-foreground'];
  const medalBgs = ['bg-amber-100 dark:bg-amber-900/30', 'bg-slate-100 dark:bg-slate-800/50', 'bg-amber-50 dark:bg-amber-900/20', 'bg-muted/30', 'bg-muted/30'];

  const RankingList = ({ items, type }: { items: RankingItem[]; type: 'valor' | 'quantidade' }) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Sem dados no período</p>
      ) : (
        items.map((item, index) => (
          <div
            key={item.nome}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold', medalBgs[index], medalColors[index])}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.nome}</p>
            </div>
            <span className="text-sm font-semibold">
              {type === 'valor' ? formatCurrency(item.valor || 0) : `${item.quantidade || 0} un`}
            </span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Medal className="h-4 w-4 text-muted-foreground" />
          Rankings do Período
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="clientes" className="text-xs gap-1.5">
              <Users className="h-3 w-3" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="produtos" className="text-xs gap-1.5">
              <Package className="h-3 w-3" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="categorias" className="text-xs gap-1.5">
              <Tags className="h-3 w-3" />
              Despesas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="clientes" className="mt-4">
            <RankingList items={topClientes} type="valor" />
          </TabsContent>
          
          <TabsContent value="produtos" className="mt-4">
            <RankingList 
              items={topProdutos.map(p => ({ nome: p.nome, quantidade: p.quantidade, valor: p.valor }))} 
              type="quantidade" 
            />
          </TabsContent>
          
          <TabsContent value="categorias" className="mt-4">
            <RankingList items={topCategorias} type="valor" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
