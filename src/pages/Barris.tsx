import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Store, Users, AlertTriangle, Droplets, Circle } from "lucide-react";
import { useBarris, useBarrisStats, Barril } from "@/hooks/useBarris";
import { BarrisTable } from "@/components/barris/BarrisTable";
import { MovimentacoesSheet } from "@/components/barris/MovimentacoesSheet";

export default function Barris() {
  const [selectedBarril, setSelectedBarril] = useState<Barril | null>(null);
  const [movimentacoesOpen, setMovimentacoesOpen] = useState(false);

  const { data: barris, isLoading } = useBarris();
  const { data: stats } = useBarrisStats();

  const handleViewMovimentacoes = (barril: Barril) => {
    setSelectedBarril(barril);
    setMovimentacoesOpen(true);
  };

  const naLojaCheios = stats?.naLojaCheia || 0;
  const naLojaVazios = stats?.naLojaVazia || 0;
  const comClientesCheios = stats?.comClientesCheia || 0;
  const comClientesVazios = stats?.comClientesVazia || 0;

  return (
    <PageLayout 
      title="Controle de Barris" 
      subtitle="Gerencie o estoque e movimentação dos 130 barris"
    >
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Barris</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{barris?.length || 0}</div>
                <p className="text-xs text-muted-foreground">barris cadastrados</p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na Loja</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{naLojaCheios + naLojaVazios}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                    <Droplets className="h-3 w-3 mr-1" />
                    {naLojaCheios} cheios
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-500/30">
                    <Circle className="h-3 w-3 mr-1" />
                    {naLojaVazios} vazios
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{comClientesCheios + comClientesVazios}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                    <Droplets className="h-3 w-3 mr-1" />
                    {comClientesCheios} cheios
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-500/30">
                    <Circle className="h-3 w-3 mr-1" />
                    {comClientesVazios} vazios
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponíveis para Entrega</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{naLojaCheios}</div>
                <p className="text-xs text-muted-foreground">barris cheios na loja</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs e Tabela */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Lista de Barris</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todos" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="todos">
                Todos ({barris?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="loja">
                Na Loja ({naLojaCheios + naLojaVazios})
              </TabsTrigger>
              <TabsTrigger value="clientes">
                Com Clientes ({comClientesCheios + comClientesVazios})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todos">
              <BarrisTable 
                barris={barris || []} 
                onViewHistory={handleViewMovimentacoes}
              />
            </TabsContent>
            
            <TabsContent value="loja">
              <BarrisTable 
                barris={(barris || []).filter(b => b.localizacao === 'LOJA')} 
                onViewHistory={handleViewMovimentacoes}
              />
            </TabsContent>
            
            <TabsContent value="clientes">
              <BarrisTable 
                barris={(barris || []).filter(b => b.localizacao === 'CLIENTE')} 
                onViewHistory={handleViewMovimentacoes}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Sheet de Movimentações */}
      <MovimentacoesSheet
        barril={selectedBarril}
        open={movimentacoesOpen}
        onOpenChange={setMovimentacoesOpen}
      />
    </PageLayout>
  );
}
