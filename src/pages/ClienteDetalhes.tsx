import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useClienteDetalhes } from '@/hooks/useClienteDetalhes';
import { ClienteHeader } from '@/components/clientes/ClienteHeader';
import { ClienteStats } from '@/components/clientes/ClienteStats';
import { ClienteInfoTab } from '@/components/clientes/ClienteInfoTab';
import { ClienteInteracoesTab } from '@/components/clientes/ClienteInteracoesTab';
import { ClientePedidosTab } from '@/components/clientes/ClientePedidosTab';
import { User, MessageSquare, ShoppingCart } from 'lucide-react';

export default function ClienteDetalhes() {
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);

  const {
    cliente,
    interacoes,
    pedidos,
    stats,
    isLoading,
    updateCliente,
    isUpdating,
    deleteCliente,
    isDeleting,
    createInteracao,
    isCreatingInteracao,
    refetch,
  } = useClienteDetalhes(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-24" />
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-3 flex-1">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <User className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Cliente não encontrado</h2>
        <p className="text-muted-foreground">O cliente solicitado não existe ou foi removido.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClienteHeader
        cliente={cliente}
        onEdit={() => setIsEditing(true)}
        onDelete={deleteCliente}
        isDeleting={isDeleting}
      />

      <ClienteStats stats={stats} />

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="info" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Informações</span>
          </TabsTrigger>
          <TabsTrigger value="interacoes" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Interações</span>
            <span className="text-xs">({interacoes.length})</span>
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Pedidos</span>
            <span className="text-xs">({pedidos.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <ClienteInfoTab
            cliente={cliente}
            onUpdate={updateCliente}
            isUpdating={isUpdating}
          />
        </TabsContent>

        <TabsContent value="interacoes">
          <ClienteInteracoesTab
            interacoes={interacoes}
            onCreateInteracao={createInteracao}
            isCreating={isCreatingInteracao}
          />
        </TabsContent>

        <TabsContent value="pedidos">
          <ClientePedidosTab
            pedidos={pedidos}
            clienteId={id!}
            onRefresh={refetch}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
