import { useState, useEffect, useCallback } from 'react';
import { useWhatsApp, WhatsAppConversa } from '@/hooks/useWhatsApp';
import { WhatsAppKPIs } from '@/components/whatsapp/WhatsAppKPIs';
import { ConversasList } from '@/components/whatsapp/ConversasList';
import { ChatView } from '@/components/whatsapp/ChatView';
import { GerarQRCodeDialog } from '@/components/whatsapp/GerarQRCodeDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageSquare, QrCode, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const STATUS_URL = 'https://vssolutionsssss.app.n8n.cloud/webhook/whatsapp/evolution-webhook';

export default function WhatsApp() {
  const {
    conversas,
    loadingConversas,
    stats,
    getMensagens,
    enviarMensagem,
    marcarComoLida,
  } = useWhatsApp();

  const [conversaSelecionada, setConversaSelecionada] = useState<WhatsAppConversa | undefined>();
  const [dialogNovaConversa, setDialogNovaConversa] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  
  // Estados de conexão conforme especificado
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const { data: mensagens = [], isLoading: loadingMensagens } = getMensagens(
    conversaSelecionada?.id || ''
  );

  // Função para buscar o status no backend
  const fetchWhatsappStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    
    try {
      const response = await fetch(STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as {
        state?: string;
        instanceName?: string;
        isConnected?: boolean;
        connected?: boolean;
      };

      // Fallback inteligente: suporta diferentes formatos do backend
      const connected =
        typeof data.isConnected === 'boolean'
          ? data.isConnected
          : typeof data.connected === 'boolean'
            ? data.connected
            : data.state === 'CONNECTED' || data.state === 'open';

      setIsConnected(connected);
      setInstanceName(data.instanceName ?? null);
    } catch (err) {
      console.error('Erro ao verificar status do WhatsApp:', err);
      setStatusError('Não consegui verificar o status. Tente novamente.');
      setIsConnected(null);
      setInstanceName(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // Chamar o status ao carregar a página
  useEffect(() => {
    fetchWhatsappStatus();
  }, [fetchWhatsappStatus]);
  const handleSelecionarConversa = async (conversa: WhatsAppConversa) => {
    setConversaSelecionada(conversa);
    if (conversa.nao_lida) {
      await marcarComoLida(conversa.id);
    }
  };

  const handleEnviarMensagem = async (mensagem: string) => {
    if (!conversaSelecionada) return;

    await enviarMensagem({
      conversa_id: conversaSelecionada.id,
      nome_cliente: conversaSelecionada.nome_contato,
      mensagem,
      status: 'enviada',
      tipo: 'enviada',
      data_hora: new Date().toISOString(),
    });
  };

  const handleConnected = (name: string) => {
    setIsConnected(true);
    setInstanceName(name);
    setQrDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Business</h1>
          <p className="text-muted-foreground">Painel de Controle e Engajamento</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Status de Conexão */}
          {isLoadingStatus && (
            <Badge variant="outline" className="gap-2 bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando...
            </Badge>
          )}
          
          {statusError && !isLoadingStatus && (
            <span className="text-sm text-destructive">{statusError}</span>
          )}
          
          {!isLoadingStatus && !statusError && isConnected === true && (
            <Badge variant="outline" className="gap-2 bg-green-500/10 text-green-600 border-green-500/30">
              <CheckCircle2 className="h-4 w-4" />
              Conectado
              {instanceName && (
                <span className="opacity-80">({instanceName})</span>
              )}
            </Badge>
          )}
          
          {!isLoadingStatus && !statusError && isConnected === false && (
            <Badge variant="outline" className="gap-2 bg-destructive/10 text-destructive border-destructive/30">
              <XCircle className="h-4 w-4" />
              Desconectado
            </Badge>
          )}
          
          {!isLoadingStatus && !statusError && isConnected === null && (
            <Badge variant="outline" className="gap-2 bg-muted text-muted-foreground border-muted-foreground/30">
              Status desconhecido
            </Badge>
          )}

          {/* Botão Verificar Status */}
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2" 
            onClick={fetchWhatsappStatus}
            disabled={isLoadingStatus}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            Verificar status
          </Button>

          {/* Botão Gerar QR Code - desabilitado se conectado ou carregando */}
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={() => setQrDialogOpen(true)}
            disabled={isConnected || isLoadingStatus}
          >
            <QrCode className="h-4 w-4" />
            Gerar QR Code
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <WhatsAppKPIs stats={stats} />

      {/* Tabs */}
      <Tabs defaultValue="conversas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="conversas">Conversas</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Aba Conversas */}
        <TabsContent value="conversas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Conversas */}
            <div className="lg:col-span-1">
              <ConversasList
                conversas={conversas}
                isLoading={loadingConversas}
                onSelectConversa={handleSelecionarConversa}
                selectedConversaId={conversaSelecionada?.id}
                onNovaConversa={() => setDialogNovaConversa(true)}
              />
            </div>

            {/* Chat */}
            <div className="lg:col-span-2">
              <ChatView
                conversa={conversaSelecionada}
                mensagens={mensagens}
                isLoading={loadingMensagens}
                onEnviarMensagem={handleEnviarMensagem}
                onSelecionarTemplate={() => {}}
              />
            </div>
          </div>
        </TabsContent>

        {/* Aba Campanhas */}
        <TabsContent value="campanhas">
          <Card>
            <CardHeader>
              <CardTitle>Campanhas de WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Campanhas em Desenvolvimento</p>
                <p className="text-sm">
                  Em breve você poderá criar e gerenciar campanhas de mensagens em massa
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Templates */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Templates de Mensagem</CardTitle>
                <Button>Novo Template</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Templates em Desenvolvimento</p>
                <p className="text-sm">
                  Em breve você poderá criar e gerenciar templates de mensagens
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Nova Conversa */}
      <Dialog open={dialogNovaConversa} onOpenChange={setDialogNovaConversa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            <p>Funcionalidade em desenvolvimento</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog QR Code */}
      <GerarQRCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        onConnected={handleConnected}
      />
    </div>
  );
}
