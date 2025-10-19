import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Phone, Mail, Building, MapPin, MessageSquare, ShoppingCart } from 'lucide-react';
import { mockClientes } from '@/data/clientes.mock';
import { mockLeads } from '@/data/leads.mock';
import { mockPedidos } from '@/data/pedidos.mock';

export default function ClienteDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Buscar cliente ou lead
  const cliente = mockClientes.find(c => c.id === id);
  const lead = mockLeads.find(l => l.id === id);
  const data = cliente || lead;

  // Buscar pedidos do cliente
  const pedidosCliente = mockPedidos.filter(p => p.clienteId === id);

  if (!data) {
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
                {data.nome.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-2xl">{data.nome}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge className={
                    'status' in data && data.status === 'ativo' ? 'bg-green-500' :
                    'status' in data && data.status === 'inativo' ? 'bg-gray-500' :
                    'bg-yellow-500'
                  }>
                    {'status' in data ? data.status : lead?.status}
                  </Badge>
                  <Badge variant="outline">{data.origem}</Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold text-secondary">
                R$ {'ticketMedio' in data ? data.ticketMedio.toLocaleString() : 
                    'valorEstimado' in data ? data.valorEstimado.toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="interacoes">Interações</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos ({pedidosCliente.length})</TabsTrigger>
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
                    <p className="font-medium">{data.telefone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium">{data.email || 'Não informado'}</p>
                  </div>
                </div>
                {'empresa' in data && data.empresa && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Empresa</p>
                      <p className="font-medium">{data.empresa}</p>
                    </div>
                  </div>
                )}
                {'endereco' in data && data.endereco && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {data.endereco.cidade}, {data.endereco.estado}
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
              <Button size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Nova Interação
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Nenhuma interação registrada
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pedidos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Histórico de Pedidos</CardTitle>
              <Button size="sm">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
            </CardHeader>
            <CardContent>
              {pedidosCliente.length > 0 ? (
                <div className="space-y-4">
                  {pedidosCliente.map(pedido => (
                    <div key={pedido.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">Pedido #{pedido.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge>{pedido.status}</Badge>
                      </div>
                      <p className="text-lg font-bold text-secondary">
                        R$ {pedido.valorTotal.toLocaleString('pt-BR')}
                      </p>
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
                {('observacoes' in data && data.observacoes) || 'Nenhuma observação registrada'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
