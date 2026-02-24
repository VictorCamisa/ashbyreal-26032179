import { useState } from 'react';
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
import { Search, MoreVertical, Store, User, Droplet, History, ExternalLink, Factory } from 'lucide-react';
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
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const { atualizarStatusBarril, transferirBarrilManual, isLoading } = useBarrisMutations();

  const filteredBarris = barris.filter(barril => {
    const parceiroNome = barril.lojista?.nome || barril.lojista?.nome_fantasia || barril.cliente?.nome || '';
    const matchesSearch = 
      barril.codigo.toLowerCase().includes(search.toLowerCase()) ||
      parceiroNome.toLowerCase().includes(search.toLowerCase());
    
    const matchesLocalizacao = 
      filterLocalizacao === 'todos' || barril.localizacao === filterLocalizacao;
    
    const matchesStatus = 
      filterStatus === 'todos' || barril.status_conteudo === filterStatus;
    
    return matchesSearch && matchesLocalizacao && matchesStatus;
  });

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
    
    // Se for para cliente, mantém o cliente_id atual (se houver)
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
        
        <Select value={filterLocalizacao} onValueChange={setFilterLocalizacao}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Localização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="DATTA_VALE">Datta Vale</SelectItem>
            <SelectItem value="ASHBY">Ashby</SelectItem>
            <SelectItem value="LOJA">Na Loja</SelectItem>
            <SelectItem value="CLIENTE">Com Cliente</SelectItem>
            <SelectItem value="FABRICA">Fábrica (legado)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="CHEIO">Cheio</SelectItem>
            <SelectItem value="VAZIO">Vazio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Capacidade</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Última Mov.</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBarris.map((barril) => (
              <TableRow key={barril.id}>
                <TableCell className="font-mono font-medium">
                  {barril.codigo}
                </TableCell>
                <TableCell>{barril.capacidade}L</TableCell>
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
            {filteredBarris.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum barril encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Mostrando {filteredBarris.length} de {barris.length} barris
      </div>
    </div>
  );
}
