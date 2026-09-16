import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Users, Factory, Droplet, Gauge } from "lucide-react";
import { useBarris, Barril } from "@/hooks/useBarris";
import { BarrisTable } from "@/components/barris/BarrisTable";
import { MovimentacoesSheet } from "@/components/barris/MovimentacoesSheet";

export default function Barris() {
  const dattaValeSaldoFabrica = { total: -51, litros50: -22, litros30: -29 };
  const co2Loja = [
    { capacidade: '9 kg', quantidade: 9 },
    { capacidade: '5 m³ (mix)', quantidade: 1 },
    { capacidade: '4 kg', quantidade: 2 },
    { capacidade: '2 kg', quantidade: 1 },
    { capacidade: '3 kg', quantidade: 1 },
    { capacidade: '7 kg', quantidade: 1 },
    { capacidade: '6 kg', quantidade: 1 },
  ];
  const [selectedBarril, setSelectedBarril] = useState<Barril | null>(null);
  const [movimentacoesOpen, setMovimentacoesOpen] = useState(false);
  const { data: barris, isLoading } = useBarris();

  const handleViewMovimentacoes = (barril: Barril) => {
    setSelectedBarril(barril);
    setMovimentacoesOpen(true);
  };

  const computed = useMemo(() => {
    const all = barris || [];
    // O fornecedor não é a localização física. Barris da carga inicial B001...
    // guardam essa informação nas observações; códigos antigos usam ASH/DTV.
    const getFornecedor = (barril: Barril) => {
      const fornecedor = barril.observacoes
        ?.match(/Fornecedor\/proprietário:\s*([^;]+)/i)?.[1]
        ?.trim()
        ?.toLowerCase();

      if (fornecedor?.includes('ashby') || barril.codigo.startsWith('ASH')) return 'ASHBY';
      if (
        fornecedor?.includes('data valley') ||
        fornecedor?.includes('datta vale') ||
        barril.codigo.startsWith('DTV')
      ) return 'DATTA_VALE';
      return 'NAO_CONFIRMADO';
    };

    const ashby = all.filter(b => getFornecedor(b) === 'ASHBY');
    const dtv = all.filter(b => getFornecedor(b) === 'DATTA_VALE');
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
    const clientesComFornecedor = ashbyComCliente + dtvComCliente;
    const clientesSemFornecedor = clientes.filter(b => getFornecedor(b) === 'NAO_CONFIRMADO').length;

    const clientesUnicos = new Set(
      clientes.filter(b => b.cliente_id || b.lojista_id)
        .map(b => b.cliente_id || b.lojista_id)
    ).size;

    return {
      ashby, dtv, loja, clientes,
      ashbyCheios, ashbyNaFabrica, ashbyNaLoja, ashbyComCliente,
      dtvCheios, dtvNaFabrica, dtvNaLoja, dtvComCliente,
      clientesUnicos, clientesComFornecedor, clientesSemFornecedor,
    };
  }, [barris]);

  return (
    <PageLayout 
      title="Controle de Barris" 
      subtitle="Gerencie o estoque e movimentação dos barris"
    >
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                <p className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                  Fábrica Ashby: 14×50L · 5×30L · 2×20L · 2×10L
                </p>
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
                  <span className="font-semibold text-destructive" title="Saldo de barris emprestados pela Datta Vale">
                    🏭 {dattaValeSaldoFabrica.total} fábrica
                  </span>
                  <span>🏪 {computed.dtvNaLoja} loja</span>
                  <span>👤 {computed.dtvComCliente} clientes</span>
                </div>
                <p className="mt-2 text-xs font-medium text-destructive">
                  Saldo Datta Vale: {dattaValeSaldoFabrica.litros50}×50L · {dattaValeSaldoFabrica.litros30}×30L
                </p>
              </>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Painel independente de CO₂ */}
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5 text-emerald-600" />
            Controle de CO₂
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">CO₂ na loja</p>
                <p className="text-3xl font-bold">16</p>
              </div>
              <Store className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {co2Loja.map(item => (
                <Badge key={item.capacidade} variant="secondary">
                  {item.quantidade}× {item.capacidade}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-dashed p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">CO₂ com clientes</p>
                <p className="mt-1 text-sm text-muted-foreground">Informação pendente</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

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
                  👤 Clientes ({computed.clientesComFornecedor})
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
              <div className="mb-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {computed.ashbyComCliente} Ashby + {computed.dtvComCliente} Datta Vale = {computed.clientesComFornecedor} barris com clientes.
                {computed.clientesSemFornecedor > 0 && ` ${computed.clientesSemFornecedor} barril(is) aguardando confirmação do fornecedor não entram nesta soma.`}
              </div>
              <BarrisTable
                barris={computed.clientes.filter(b => computed.ashby.includes(b) || computed.dtv.includes(b))}
                onViewHistory={handleViewMovimentacoes}
              />
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
