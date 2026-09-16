import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Factory, Gauge } from "lucide-react";
import { useBarris, Barril } from "@/hooks/useBarris";
import { BarrisTable } from "@/components/barris/BarrisTable";
import { MovimentacoesSheet } from "@/components/barris/MovimentacoesSheet";
import { cn } from "@/lib/utils";

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

    const getConteudo = (barril: Barril) => barril.observacoes
      ?.match(/Conteúdo:\s*([^;]+)/i)?.[1]
      ?.trim()
      ?.replace(/^chopp\s+/i, '') || '';

    const formatBreakdown = (items: Barril[], includeConteudo = false) => {
      const groups = new Map<string, { quantidade: number; capacidade: number; conteudo: string }>();
      items.forEach(barril => {
        const conteudo = includeConteudo ? getConteudo(barril) : '';
        const key = `${barril.capacidade}|${conteudo.toLowerCase()}`;
        const current = groups.get(key) || { quantidade: 0, capacidade: barril.capacidade, conteudo };
        current.quantidade += 1;
        groups.set(key, current);
      });
      return [...groups.values()]
        .sort((a, b) => b.capacidade - a.capacidade || a.conteudo.localeCompare(b.conteudo))
        .map(group => `${String(group.quantidade).padStart(2, '0')} × ${group.capacidade}L${group.conteudo ? ` ${group.conteudo}` : ''}`)
        .join(' / ');
    };

    const clientesUnicos = new Set(
      clientes.filter(b => b.cliente_id || b.lojista_id)
        .map(b => b.cliente_id || b.lojista_id)
    ).size;

    return {
      ashby, dtv, loja, clientes,
      ashbyCheios, ashbyNaFabrica, ashbyNaLoja, ashbyComCliente,
      dtvCheios, dtvNaFabrica, dtvNaLoja, dtvComCliente,
      clientesUnicos, clientesComFornecedor, clientesSemFornecedor,
      ashbyCheiosDetalhe: formatBreakdown(ashby.filter(b => b.status_conteudo === 'CHEIO'), true),
      ashbyFabricaDetalhe: formatBreakdown(ashby.filter(b => b.localizacao === 'ASHBY' || b.localizacao === 'FABRICA')),
      ashbyLojaDetalhe: formatBreakdown(ashby.filter(b => b.localizacao === 'LOJA')),
      ashbyClientesDetalhe: formatBreakdown(ashby.filter(b => b.localizacao === 'CLIENTE')),
      dtvCheiosDetalhe: formatBreakdown(dtv.filter(b => b.status_conteudo === 'CHEIO'), true),
      dtvLojaDetalhe: formatBreakdown(dtv.filter(b => b.localizacao === 'LOJA')),
      dtvClientesDetalhe: formatBreakdown(dtv.filter(b => b.localizacao === 'CLIENTE')),
    };
  }, [barris]);

  return (
    <PageLayout 
      title="Controle de Barris" 
      subtitle="Gerencie o estoque e movimentação dos barris"
    >
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Ashby */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🔵 Ashby</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <MetricLine value={computed.ashbyCheios} label="Cheios" detail={computed.ashbyCheiosDetalhe} accent="text-blue-700 dark:text-blue-300" />
                <MetricLine value={computed.ashbyNaFabrica} label="Fábrica" detail={computed.ashbyFabricaDetalhe} />
                <MetricLine value={computed.ashbyNaLoja} label="Na loja" detail={computed.ashbyLojaDetalhe} />
                <MetricLine value={computed.ashbyComCliente} label="Com clientes" detail={computed.ashbyClientesDetalhe} />
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
          <CardContent className="space-y-3">
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <MetricLine value={computed.dtvCheios} label="Cheios" detail={computed.dtvCheiosDetalhe} accent="text-amber-700 dark:text-amber-300" />
                <MetricLine value={dattaValeSaldoFabrica.total} label="Saldo fábrica" detail={`${dattaValeSaldoFabrica.litros50} × 50L / ${dattaValeSaldoFabrica.litros30} × 30L`} accent="text-destructive" />
                <MetricLine value={computed.dtvNaLoja} label="Na loja" detail={computed.dtvLojaDetalhe} />
                <MetricLine value={computed.dtvComCliente} label="Com clientes" detail={computed.dtvClientesDetalhe} />
              </>
            )}
          </CardContent>
        </Card>

        {/* CO₂ */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Gauge className="h-5 w-5 text-emerald-600" />
            CO₂ na loja
          </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium">
                <span className="mr-1.5 text-base font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">16</span>
                cilindros disponíveis
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Estoque físico na loja</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg bg-muted/25 px-3 py-2.5">
              {co2Loja.map(item => (
                <span key={item.capacidade} className="text-[11px] text-muted-foreground">
                  <strong className="font-medium text-foreground">{item.quantidade}×</strong> {item.capacidade}
                </span>
              ))}
            </div>
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

function MetricLine({ value, label, detail, accent }: { value: number; label: string; detail: string; accent?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm leading-none">
        <span className={cn("mr-1.5 text-base font-semibold tabular-nums", accent)}>{value}</span>
        <span className="font-medium">{label}</span>
      </p>
      {detail && (
        <p className="mt-1 truncate text-[11px] leading-relaxed text-muted-foreground" title={detail}>
          {detail}
        </p>
      )}
    </div>
  );
}
