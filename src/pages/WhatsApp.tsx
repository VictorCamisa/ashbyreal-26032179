import { useState, useEffect } from 'react';
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
import { MessageSquare, QrCode, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_URL = 'https://clauberveiculos-n8n.fjsxhg.easypanel.host/webhook/whatsapp/state';

type ConnectionStatus = 'loading' | 'connected' | 'disconnected';

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
  
  // Estados de conexão
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('loading');
  const [instanceName, setInstanceName] = useState<string | null>(null);

  const { data: mensagens = [], isLoading: loadingMensagens } = getMensagens(
    conversaSelecionada?.id || ''
  );

  // Verificar status de conexão ao carregar a página
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(STATUS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error('Falha na requisição');
        }

        const data = await response.json();

        if (data?.isConnected === true) {
          setConnectionStatus('connected');
          setInstanceName(data.instanceName || 'WhatsApp');
        } else {
          setConnectionStatus('disconnected');
          setInstanceName(null);
        }
      } catch (err) {
        console.error('Erro ao verificar status do WhatsApp:', err);
        setConnectionStatus('disconnected');
        setInstanceName(null);
      }
    };

    checkStatus();
  }, []);

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
    setConnectionStatus('connected');
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
          {connectionStatus === 'loading' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verificando status...</span>
            </div>
          )}
          
          {connectionStatus === 'connected' && (
            <Badge variant="outline" className="gap-2 bg-green-500/10 text-green-600 border-green-500/30">
              <CheckCircle2 className="h-4 w-4" />
              Conectado — {instanceName}
            </Badge>
          )}
          
          {connectionStatus === 'disconnected' && (
            <Badge variant="outline" className="gap-2 bg-destructive/10 text-destructive border-destructive/30">
              <XCircle className="h-4 w-4" />
              Não conectado
            </Badge>
          )}

          {/* Botão Gerar QR Code - só aparece se desconectado */}
          {connectionStatus === 'disconnected' && (
            <Button variant="outline" className="gap-2" onClick={() => setQrDialogOpen(true)}>
              <QrCode className="h-4 w-4" />
              Gerar QR Code
            </Button>
          )}
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
