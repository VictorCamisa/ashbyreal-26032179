import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Store, Users, Factory } from "lucide-react";
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

  const [fabricaSub, setFabricaSub] = useState<string>('todas');

  const computed = useMemo(() => {
    const all = barris || [];
    const fabrica = all.filter(b => b.localizacao === 'ASHBY' || b.localizacao === 'DATTA_VALE' || b.localizacao === 'FABRICA');
    const fabricaAshby = all.filter(b => b.localizacao === 'ASHBY');
    const fabricaDtv = all.filter(b => b.localizacao === 'DATTA_VALE');
    const loja = all.filter(b => b.localizacao === 'LOJA');
    const clientes = all.filter(b => b.localizacao === 'CLIENTE');
    const clientesUnicos = new Set(clientes.filter(b => b.cliente_id).map(b => b.cliente_id)).size;

    return { fabrica, fabricaAshby, fabricaDtv, loja, clientes, clientesUnicos };
  }, [barris]);

  const fabricaFiltered = useMemo(() => {
    if (fabricaSub === 'ashby') return computed.fabricaAshby;
    if (fabricaSub === 'datta_vale') return computed.fabricaDtv;
    return computed.fabrica;
  }, [fabricaSub, computed]);

  return (
    <PageLayout 
      title="Controle de Barris" 
      subtitle="Gerencie o estoque e movimentação dos barris"
    >
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{barris?.length || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fábrica</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{computed.fabrica.length}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na Loja</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{computed.loja.length}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{computed.clientes.length}</div>
                <p className="text-xs text-muted-foreground">{computed.clientesUnicos} clientes</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs por Local + Tabela */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Lista de Barris</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todos" className="w-full">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="mb-4 w-max sm:w-auto">
                <TabsTrigger value="todos" className="text-xs sm:text-sm">
                  Todos ({barris?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="fabrica" className="text-xs sm:text-sm">
                  🏭 Fábrica ({computed.fabrica.length})
                </TabsTrigger>
                <TabsTrigger value="loja" className="text-xs sm:text-sm">
                  🏪 Loja ({computed.loja.length})
                </TabsTrigger>
                <TabsTrigger value="cliente" className="text-xs sm:text-sm">
                  👤 Clientes ({computed.clientes.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="todos">
              <BarrisTable barris={barris || []} onViewHistory={handleViewMovimentacoes} />
            </TabsContent>
            <TabsContent value="fabrica">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setFabricaSub('todas')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${fabricaSub === 'todas' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  Todas ({computed.fabrica.length})
                </button>
                <button
                  onClick={() => setFabricaSub('ashby')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${fabricaSub === 'ashby' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  🔵 Ashby ({computed.fabricaAshby.length})
                </button>
                <button
                  onClick={() => setFabricaSub('datta_vale')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${fabricaSub === 'datta_vale' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  🟡 Datta Vale ({computed.fabricaDtv.length})
                </button>
              </div>
              <BarrisTable barris={fabricaFiltered} onViewHistory={handleViewMovimentacoes} />
            </TabsContent>
            <TabsContent value="loja">
              <BarrisTable barris={computed.loja} onViewHistory={handleViewMovimentacoes} />
            </TabsContent>
            <TabsContent value="cliente">
              <BarrisTable barris={computed.clientes} onViewHistory={handleViewMovimentacoes} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <MovimentacoesSheet
        barril={selectedBarril}
        open={movimentacoesOpen}
        onOpenChange={setMovimentacoesOpen}
      />
    </PageLayout>
  );
}
