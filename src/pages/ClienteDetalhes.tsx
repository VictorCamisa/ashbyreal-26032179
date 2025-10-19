import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone, Mail, Building, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Cliente } from '@/types/cliente';
import type { Interacao } from '@/types/cliente';
import { NovaInteracaoDialog } from '@/components/clientes/NovaInteracaoDialog';
import { NovoPedidoDialog } from '@/components/clientes/NovoPedidoDialog';

interface Pedido {
  id: string;
  numero_pedido: string;
  status: string;
  valor_total: number;
  data_pedido: string;
  data_entrega: string | null;
  observacoes: string | null;
}

export default function ClienteDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      // Fetch cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (clienteError) throw clienteError;
      
      if (clienteData) {
        const cliente: Cliente = {
          id: clienteData.id,
          nome: clienteData.nome,
          email: clienteData.email,
          telefone: clienteData.telefone,
          empresa: clienteData.empresa || undefined,
          cpfCnpj: clienteData.cpf_cnpj || undefined,
          endereco: clienteData.endereco as Cliente['endereco'] | undefined,
          status: clienteData.status as Cliente['status'],
          origem: clienteData.origem as Cliente['origem'],
          ticketMedio: Number(clienteData.ticket_medio) || 0,
          dataCadastro: clienteData.data_cadastro || clienteData.created_at,
          ultimoContato: clienteData.ultimo_contato || undefined,
          observacoes: clienteData.observacoes || undefined,
          avatar: clienteData.avatar || undefined,
          createdAt: clienteData.created_at,
          updatedAt: clienteData.updated_at
        };
        setCliente(cliente);

        // Fetch interacoes
        const { data: interacoesData, error: interacoesError } = await supabase
          .from('interacoes')
          .select('*')
          .eq('cliente_id', id)
          .order('data', { ascending: false });

        if (interacoesError) throw interacoesError;
        
        const interacoes: Interacao[] = (interacoesData || []).map(i => ({
          id: i.id,
          clienteId: i.cliente_id,
          tipo: i.tipo as Interacao['tipo'],
          descricao: i.descricao,
          data: i.data,
          responsavel: i.responsavel,
          createdAt: i.created_at
        }));
        setInteracoes(interacoes);

        // Fetch pedidos
        const { data: pedidosData, error: pedidosError } = await supabase
          .from('pedidos')
          .select('*')
          .eq('cliente_id', id)
          .order('data_pedido', { ascending: false });

        if (pedidosError) throw pedidosError;
        setPedidos(pedidosData || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <p>Cliente não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold">
                {cliente.nome.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-2xl">{cliente.nome}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge className={
                    cliente.status === 'ativo' ? 'bg-green-500' :
                    cliente.status === 'inativo' ? 'bg-gray-500' :
                    'bg-yellow-500'
                  }>
                    {cliente.status}
                  </Badge>
                  <Badge variant="outline">{cliente.origem}</Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold text-secondary">
                R$ {cliente.ticketMedio.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="interacoes">Interações ({interacoes.length})</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos ({pedidos.length})</TabsTrigger>
          <TabsTrigger value="observacoes">Observações</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{cliente.telefone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium">{cliente.email || 'Não informado'}</p>
                  </div>
                </div>
                {cliente.empresa && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Empresa</p>
                      <p className="font-medium">{cliente.empresa}</p>
                    </div>
                  </div>
                )}
                {cliente.endereco && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {cliente.endereco.cidade}, {cliente.endereco.estado}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interacoes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Histórico de Interações</CardTitle>
              <NovaInteracaoDialog clienteId={id!} onSuccess={fetchData} />
            </CardHeader>
            <CardContent>
              {interacoes.length > 0 ? (
                <div className="space-y-4">
                  {interacoes.map((interacao) => (
                    <div key={interacao.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {interacao.tipo}
                          </Badge>
                          <p className="text-sm font-medium">{interacao.descricao}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(interacao.data).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Responsável: {interacao.responsavel}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma interação registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pedidos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Histórico de Pedidos</CardTitle>
              <NovoPedidoDialog clienteId={id!} onSuccess={fetchData} />
            </CardHeader>
            <CardContent>
              {pedidos.length > 0 ? (
                <div className="space-y-4">
                  {pedidos.map((pedido) => (
                    <div key={pedido.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">Pedido #{pedido.numero_pedido}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge>{pedido.status}</Badge>
                      </div>
                      <p className="text-lg font-bold text-secondary">
                        R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {pedido.data_entrega && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Entrega: {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {pedido.observacoes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {pedido.observacoes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum pedido realizado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="observacoes">
          <Card>
            <CardHeader>
              <CardTitle>Observações Internas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {cliente.observacoes || 'Nenhuma observação registrada'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
