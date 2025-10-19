import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone, Mail, Building, MapPin, MessageSquare, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Cliente } from '@/types/cliente';

export default function ClienteDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCliente() {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          // Transform database format to Cliente type
          const clienteData: Cliente = {
            id: data.id,
            nome: data.nome,
            email: data.email,
            telefone: data.telefone,
            empresa: data.empresa || undefined,
            cpfCnpj: data.cpf_cnpj || undefined,
            endereco: data.endereco as Cliente['endereco'] | undefined,
            status: data.status as Cliente['status'],
            origem: data.origem as Cliente['origem'],
            ticketMedio: Number(data.ticket_medio) || 0,
            dataCadastro: data.data_cadastro || data.created_at,
            ultimoContato: data.ultimo_contato || undefined,
            observacoes: data.observacoes || undefined,
            avatar: data.avatar || undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
          setCliente(clienteData);
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCliente();
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
          <TabsTrigger value="interacoes">Interações</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos (0)</TabsTrigger>
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
              <p className="text-muted-foreground text-center py-8">
                Nenhum pedido realizado
              </p>
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
