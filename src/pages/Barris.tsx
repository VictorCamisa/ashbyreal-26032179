import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Store, Users, Factory, Droplets, Circle, MapPin } from "lucide-react";
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

  // Computed stats by marca (prefix)
  const marcaStats = useMemo(() => {
    if (!barris) return { dtv: { total: 0, loja: 0, clientes: 0, cheios: 0, vazios: 0 }, ash: { total: 0, loja: 0, clientes: 0, fabrica: 0, cheios: 0, vazios: 0 } };
    
    const dtv = barris.filter(b => b.codigo.startsWith('DTV'));
    const ash = barris.filter(b => b.codigo.startsWith('ASH'));
    
    return {
      dtv: {
        total: dtv.length,
        loja: dtv.filter(b => b.localizacao === 'LOJA').length,
        clientes: dtv.filter(b => b.localizacao === 'CLIENTE').length,
        cheios: dtv.filter(b => b.status_conteudo === 'CHEIO').length,
        vazios: dtv.filter(b => b.status_conteudo === 'VAZIO').length,
      },
      ash: {
        total: ash.length,
        loja: ash.filter(b => b.localizacao === 'LOJA').length,
        clientes: ash.filter(b => b.localizacao === 'CLIENTE').length,
        fabrica: ash.filter(b => b.localizacao === 'ASHBY' || b.localizacao === 'DATTA_VALE').length,
        cheios: ash.filter(b => b.status_conteudo === 'CHEIO').length,
        vazios: ash.filter(b => b.status_conteudo === 'VAZIO').length,
      },
    };
  }, [barris]);

  // Group barrels by location for summary
  const locationSummary = useMemo(() => {
    if (!barris) return [];
    
    const groups: Record<string, { label: string; locType: string; count: number; cheios: number; vazios: number }> = {};
    
    barris.forEach(b => {
      let key: string = b.localizacao;
      let label: string = b.localizacao;
      
      if (b.localizacao === 'CLIENTE' && b.cliente) {
        key = `CLIENTE_${b.cliente.id}`;
        label = b.cliente.nome;
      } else if (b.localizacao === 'LOJA') {
        label = 'Na Loja';
      } else if (b.localizacao === 'ASHBY') {
        label = 'Fábrica Ashby';
      } else if (b.localizacao === 'DATTA_VALE') {
        label = 'Fábrica Datta Vale';
      }
      
      if (!groups[key]) {
        groups[key] = { label, locType: b.localizacao, count: 0, cheios: 0, vazios: 0 };
      }
      groups[key].count++;
      if (b.status_conteudo === 'CHEIO') groups[key].cheios++;
      else groups[key].vazios++;
    });
    
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [barris]);

  return (
    <PageLayout 
      title="Controle de Barris" 
      subtitle="Gerencie o estoque e movimentação dos barris"
    >
      {/* KPIs - Resumo por local */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Barris</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{barris?.length || 0}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    DTV: {marcaStats.dtv.total}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-accent-foreground/30 text-accent-foreground">
                    ASH: {marcaStats.ash.total}
                  </Badge>
                </div>
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
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{(barris || []).filter(b => b.localizacao === 'LOJA').length}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs border-green-500/30 text-green-600">
                    <Droplets className="h-3 w-3 mr-1" />
                    {(barris || []).filter(b => b.localizacao === 'LOJA' && b.status_conteudo === 'CHEIO').length} cheios
                  </Badge>
                  <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
                    <Circle className="h-3 w-3 mr-1" />
                    {(barris || []).filter(b => b.localizacao === 'LOJA' && b.status_conteudo === 'VAZIO').length} vazios
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
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{(barris || []).filter(b => b.localizacao === 'CLIENTE').length}</div>
                <p className="text-xs text-muted-foreground">
                  {locationSummary.filter(l => l.locType === 'CLIENTE').length} clientes diferentes
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nas Fábricas</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">
                  {(barris || []).filter(b => b.localizacao === 'ASHBY' || b.localizacao === 'DATTA_VALE' || b.localizacao === 'FABRICA').length}
                </div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    Ashby: {(barris || []).filter(b => b.localizacao === 'ASHBY').length}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-accent-foreground/30 text-accent-foreground">
                    DTV: {(barris || []).filter(b => b.localizacao === 'DATTA_VALE').length}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo por cliente - mini cards */}
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Barris por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {locationSummary
              .filter(l => l.locType === 'CLIENTE')
              .map((loc) => (
                <Badge 
                  key={loc.label} 
                  variant="outline" 
                  className="text-xs py-1.5 px-3 gap-1.5 border-border"
                >
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{loc.label}</span>
                  <span className="text-muted-foreground">({loc.cheios} cheio{loc.cheios !== 1 ? 's' : ''})</span>
                </Badge>
              ))
            }
            {locationSummary.filter(l => l.locType === 'CLIENTE').length === 0 && (
              <span className="text-sm text-muted-foreground">Nenhum barril com clientes</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs por Marca + Tabela */}
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
                <TabsTrigger value="datta_vale" className="text-xs sm:text-sm">
                  🟡 Datta Vale ({marcaStats.dtv.total})
                </TabsTrigger>
                <TabsTrigger value="ashby" className="text-xs sm:text-sm">
                  🔵 Ashby ({marcaStats.ash.total})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="todos">
              <BarrisTable 
                barris={barris || []} 
                onViewHistory={handleViewMovimentacoes}
              />
            </TabsContent>
            
            <TabsContent value="datta_vale">
              <BarrisTable 
                barris={(barris || []).filter(b => b.codigo.startsWith('DTV'))} 
                onViewHistory={handleViewMovimentacoes}
              />
            </TabsContent>
            
            <TabsContent value="ashby">
              <BarrisTable 
                barris={(barris || []).filter(b => b.codigo.startsWith('ASH'))} 
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