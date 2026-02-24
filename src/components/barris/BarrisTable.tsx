import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, MoreVertical, Store, User, Droplet, History, ExternalLink, Factory, ChevronDown, ChevronRight } from 'lucide-react';
import { Barril } from '@/hooks/useBarris';
import { useBarrisMutations } from '@/hooks/useBarrisMutations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BarrisTableProps {
  barris: Barril[];
  onViewHistory: (barril: Barril) => void;
}

export function BarrisTable({ barris, onViewHistory }: BarrisTableProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterLocalizacao, setFilterLocalizacao] = useState<string>('todos');
  const [filterCliente, setFilterCliente] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { atualizarStatusBarril, transferirBarrilManual, isLoading } = useBarrisMutations();

  // Get unique clients from barrels
  const clientesUnicos = useMemo(() => {
    const map = new Map<string, string>();
    barris.forEach(b => {
      if (b.cliente_id && b.cliente) {
        map.set(b.cliente.id, b.cliente.nome);
      }
      if (b.lojista_id && b.lojista) {
        map.set(b.lojista.id, b.lojista.nome_fantasia || b.lojista.nome);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [barris]);

  const filteredBarris = barris.filter(barril => {
    const parceiroNome = barril.lojista?.nome || barril.lojista?.nome_fantasia || barril.cliente?.nome || '';
    const matchesSearch = 
      barril.codigo.toLowerCase().includes(search.toLowerCase()) ||
      parceiroNome.toLowerCase().includes(search.toLowerCase());
    
    let matchesLocalizacao = true;
    if (filterLocalizacao === 'fabrica') {
      matchesLocalizacao = barril.localizacao === 'ASHBY' || barril.localizacao === 'DATTA_VALE' || barril.localizacao === 'FABRICA';
    } else if (filterLocalizacao === 'loja') {
      matchesLocalizacao = barril.localizacao === 'LOJA';
    } else if (filterLocalizacao === 'cliente') {
      matchesLocalizacao = barril.localizacao === 'CLIENTE';
    }
    
    let matchesCliente = true;
    if (filterCliente !== 'todos') {
      matchesCliente = barril.cliente_id === filterCliente || barril.lojista_id === filterCliente;
    }
    
    const matchesStatus = 
      filterStatus === 'todos' || barril.status_conteudo === filterStatus;
    
    return matchesSearch && matchesLocalizacao && matchesCliente && matchesStatus;
  });

  // Group by capacity
  const groupedByCapacity = useMemo(() => {
    const groups: Record<number, Barril[]> = {};
    filteredBarris.forEach(b => {
      if (!groups[b.capacidade]) groups[b.capacidade] = [];
      groups[b.capacidade].push(b);
    });
    return Object.entries(groups)
      .map(([cap, items]) => ({ capacidade: Number(cap), barris: items }))
      .sort((a, b) => a.capacidade - b.capacidade);
  }, [filteredBarris]);

  const toggleGroup = (cap: number) => {
    setOpenGroups(prev => ({ ...prev, [cap]: !prev[cap] }));
  };

  const getParceiroInfo = (barril: Barril) => {
    if (barril.lojista_id && barril.lojista) {
      return {
        tipo: 'lojista' as const,
        nome: barril.lojista.nome_fantasia || barril.lojista.nome,
        id: barril.lojista.id
      };
    }
    if (barril.cliente_id && barril.cliente) {
      return {
        tipo: 'cliente' as const,
        nome: barril.cliente.nome,
        id: barril.cliente.id
      };
    }
    return null;
  };

  const handleParceiroClick = (barril: Barril) => {
    const parceiro = getParceiroInfo(barril);
    if (!parceiro) return;
    
    if (parceiro.tipo === 'lojista') {
      navigate('/estoque?tab=lojistas&lojista=' + parceiro.id);
    } else {
      navigate('/clientes/' + parceiro.id);
    }
  };

  const toggleStatus = async (barril: Barril) => {
    const novoStatus = barril.status_conteudo === 'CHEIO' ? 'VAZIO' : 'CHEIO';
    await atualizarStatusBarril(barril.id, novoStatus);
  };

  const handleLocalizacaoChange = async (barril: Barril, novaLocalizacao: 'FABRICA' | 'LOJA' | 'CLIENTE' | 'DATTA_VALE' | 'ASHBY') => {
    if (barril.localizacao === novaLocalizacao) return;
    const clienteId = novaLocalizacao === 'CLIENTE' ? barril.cliente_id : null;
    await transferirBarrilManual(
      barril.id, 
      novaLocalizacao, 
      clienteId,
      'Alteração manual de localização'
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterLocalizacao} onValueChange={(v) => { setFilterLocalizacao(v); if (v !== 'cliente') setFilterCliente('todos'); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Local" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os locais</SelectItem>
            <SelectItem value="fabrica">🏭 Fábrica</SelectItem>
            <SelectItem value="loja">🏪 Loja</SelectItem>
            <SelectItem value="cliente">👤 Cliente</SelectItem>
          </SelectContent>
        </Select>

        {/* Dropdown de clientes - aparece quando filtro é "cliente" ou "todos" */}
        {(filterLocalizacao === 'cliente' || filterLocalizacao === 'todos') && clientesUnicos.length > 0 && (
          <Select value={filterCliente} onValueChange={setFilterCliente}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecionar cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {clientesUnicos.map(([id, nome]) => (
                <SelectItem key={id} value={id}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="CHEIO">Cheio</SelectItem>
            <SelectItem value="VAZIO">Vazio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped by capacity */}
      <div className="space-y-2">
        {groupedByCapacity.map(({ capacidade, barris: groupBarris }) => {
          const isOpen = openGroups[capacidade] ?? false;
          const cheios = groupBarris.filter(b => b.status_conteudo === 'CHEIO').length;
          const vazios = groupBarris.length - cheios;

          return (
            <Collapsible key={capacidade} open={isOpen} onOpenChange={() => toggleGroup(capacidade)}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-semibold text-sm">{capacidade}L</span>
                    <Badge variant="secondary" className="text-xs">{groupBarris.length} barris</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600">
                      <Droplet className="h-3 w-3 mr-1" /> {cheios} cheios
                    </Badge>
                    <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-600">
                      <Droplet className="h-3 w-3 mr-1" /> {vazios} vazios
                    </Badge>
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border rounded-lg overflow-x-auto mt-1">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Parceiro</TableHead>
                        <TableHead>Última Mov.</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupBarris.map((barril) => (
                        <TableRow key={barril.id}>
                          <TableCell className="font-mono font-medium">
                            {barril.codigo}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={barril.localizacao}
                              onValueChange={(value: 'FABRICA' | 'LOJA' | 'CLIENTE' | 'DATTA_VALE' | 'ASHBY') => 
                                handleLocalizacaoChange(barril, value)
                              }
                              disabled={isLoading}
                            >
                              <SelectTrigger className="w-[140px] h-8">
                                <SelectValue>
                                  <span className="flex items-center gap-1.5">
                                    {barril.localizacao === 'DATTA_VALE' ? (
                                      <><Factory className="h-3 w-3" /> Datta Vale</>
                                    ) : barril.localizacao === 'ASHBY' ? (
                                      <><Factory className="h-3 w-3" /> Ashby</>
                                    ) : barril.localizacao === 'FABRICA' ? (
                                      <><Factory className="h-3 w-3" /> Fábrica</>
                                    ) : barril.localizacao === 'LOJA' ? (
                                      <><Store className="h-3 w-3" /> Loja</>
                                    ) : (
                                      <><User className="h-3 w-3" /> Cliente</>
                                    )}
                                  </span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DATTA_VALE">
                                  <span className="flex items-center gap-2">
                                    <Factory className="h-4 w-4" /> Datta Vale
                                  </span>
                                </SelectItem>
                                <SelectItem value="ASHBY">
                                  <span className="flex items-center gap-2">
                                    <Factory className="h-4 w-4" /> Ashby
                                  </span>
                                </SelectItem>
                                <SelectItem value="LOJA">
                                  <span className="flex items-center gap-2">
                                    <Store className="h-4 w-4" /> Loja
                                  </span>
                                </SelectItem>
                                <SelectItem value="CLIENTE">
                                  <span className="flex items-center gap-2">
                                    <User className="h-4 w-4" /> Cliente
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={barril.status_conteudo === 'CHEIO' 
                                ? 'border-blue-500 text-blue-500' 
                                : 'border-orange-500 text-orange-500'
                              }
                            >
                              <Droplet className="h-3 w-3 mr-1" />
                              {barril.status_conteudo === 'CHEIO' ? 'Cheio' : 'Vazio'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const parceiro = getParceiroInfo(barril);
                              if (!parceiro) return <span className="text-muted-foreground">—</span>;
                              return (
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-left font-normal gap-1"
                                  onClick={() => handleParceiroClick(barril)}
                                >
                                  {parceiro.tipo === 'lojista' ? (
                                    <Store className="h-3 w-3" />
                                  ) : (
                                    <User className="h-3 w-3" />
                                  )}
                                  <span className="truncate max-w-[120px]">{parceiro.nome}</span>
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </Button>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {barril.data_ultima_movimentacao 
                              ? format(new Date(barril.data_ultima_movimentacao), "dd/MM/yy HH:mm", { locale: ptBR })
                              : '—'
                            }
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onViewHistory(barril)}>
                                  <History className="h-4 w-4 mr-2" />
                                  Ver Histórico
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => toggleStatus(barril)}
                                  disabled={isLoading}
                                >
                                  <Droplet className="h-4 w-4 mr-2" />
                                  Marcar como {barril.status_conteudo === 'CHEIO' ? 'Vazio' : 'Cheio'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {groupedByCapacity.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            Nenhum barril encontrado
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Mostrando {filteredBarris.length} de {barris.length} barris
      </div>
    </div>
  );
}
