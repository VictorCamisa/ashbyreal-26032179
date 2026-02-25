import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Users, Factory, Droplet } from "lucide-react";
import { useBarris, Barril } from "@/hooks/useBarris";
import { BarrisTable } from "@/components/barris/BarrisTable";
import { MovimentacoesSheet } from "@/components/barris/MovimentacoesSheet";

export default function Barris() {
  const [selectedBarril, setSelectedBarril] = useState<Barril | null>(null);
  const [movimentacoesOpen, setMovimentacoesOpen] = useState(false);
  const { data: barris, isLoading } = useBarris();

  const handleViewMovimentacoes = (barril: Barril) => {
    setSelectedBarril(barril);
    setMovimentacoesOpen(true);
  };

  const computed = useMemo(() => {
    const all = barris || [];
    // Por marca (prefixo do código)
    const ashby = all.filter(b => b.codigo.startsWith('ASH'));
    const dtv = all.filter(b => b.codigo.startsWith('DTV'));
    // Por localização física
    const loja = all.filter(b => b.localizacao === 'LOJA');
    const clientes = all.filter(b => b.localizacao === 'CLIENTE');

    const ashbyCheios = ashby.filter(b => b.status_conteudo === 'CHEIO').length;
    const ashbyNaFabrica = ashby.filter(b => b.localizacao === 'ASHBY' || b.localizacao === 'FABRICA').length;
    const ashbyNaLoja = ashby.filter(b => b.localizacao === 'LOJA').length;
    const ashbyComCliente = ashby.filter(b => b.localizacao === 'CLIENTE').length;

    const dtvCheios = dtv.filter(b => b.status_conteudo === 'CHEIO').length;
    const dtvNaFabrica = dtv.filter(b => b.localizacao === 'DATTA_VALE' || b.localizacao === 'FABRICA').length;
    const dtvNaLoja = dtv.filter(b => b.localizacao === 'LOJA').length;
    const dtvComCliente = dtv.filter(b => b.localizacao === 'CLIENTE').length;

    const clientesUnicos = new Set(
      clientes.filter(b => b.cliente_id || b.lojista_id)
        .map(b => b.cliente_id || b.lojista_id)
    ).size;

    return {
      ashby, dtv, loja, clientes,
      ashbyCheios, ashbyNaFabrica, ashbyNaLoja, ashbyComCliente,
      dtvCheios, dtvNaFabrica, dtvNaLoja, dtvComCliente,
      clientesUnicos,
    };
  }, [barris]);

  return (
    <PageLayout 
      title="Controle de Barris" 
      subtitle="Gerencie o estoque e movimentação dos barris"
    >
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Ashby */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🔵 Ashby</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{computed.ashby.length}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Droplet className="h-3 w-3 text-blue-500" /> {computed.ashbyCheios} cheios
                  </span>
                  <span>🏭 {computed.ashbyNaFabrica} fábrica</span>
                  <span>🏪 {computed.ashbyNaLoja} loja</span>
                  <span>👤 {computed.ashbyComCliente} clientes</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Datta Vale */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🟡 Datta Vale</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{computed.dtv.length}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Droplet className="h-3 w-3 text-blue-500" /> {computed.dtvCheios} cheios
                  </span>
                  <span>🏭 {computed.dtvNaFabrica} fábrica</span>
                  <span>🏪 {computed.dtvNaLoja} loja</span>
                  <span>👤 {computed.dtvComCliente} clientes</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Com Clientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{computed.clientes.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {computed.clientesUnicos} clientes · {computed.clientes.filter(b => b.status_conteudo === 'CHEIO').length} cheios
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Ashby | Datta Vale | Na Loja | Com Clientes */}
      <Card className="mt-4">
        <CardContent className="pt-6">
          <Tabs defaultValue="ashby" className="w-full">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="mb-4 w-max sm:w-auto">
                <TabsTrigger value="ashby" className="text-xs sm:text-sm">
                  🔵 Ashby ({computed.ashby.length})
                </TabsTrigger>
                <TabsTrigger value="datta_vale" className="text-xs sm:text-sm">
                  🟡 Datta Vale ({computed.dtv.length})
                </TabsTrigger>
                <TabsTrigger value="loja" className="text-xs sm:text-sm">
                  🏪 Na Loja ({computed.loja.length})
                </TabsTrigger>
                <TabsTrigger value="clientes" className="text-xs sm:text-sm">
                  👤 Clientes ({computed.clientes.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ashby">
              <BarrisTable barris={computed.ashby} onViewHistory={handleViewMovimentacoes} />
            </TabsContent>
            <TabsContent value="datta_vale">
              <BarrisTable barris={computed.dtv} onViewHistory={handleViewMovimentacoes} />
            </TabsContent>
            <TabsContent value="loja">
              <BarrisTable barris={computed.loja} onViewHistory={handleViewMovimentacoes} />
            </TabsContent>
            <TabsContent value="clientes">
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
