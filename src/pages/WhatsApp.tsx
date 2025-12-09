import { useState, useEffect, useCallback } from 'react';
import { useWhatsApp, WhatsAppConversa } from '@/hooks/useWhatsApp';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppKPIs } from '@/components/whatsapp/WhatsAppKPIs';
import { ConversasList } from '@/components/whatsapp/ConversasList';
import { ChatView } from '@/components/whatsapp/ChatView';
import { GerarQRCodeDialog } from '@/components/whatsapp/GerarQRCodeDialog';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  QrCode, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Zap,
  Send,
  FileText
} from 'lucide-react';

// Edge function proxy URL
const PROXY_BASE = 'https://chmhbrcugswwmpqzhugs.supabase.co/functions/v1/whatsapp-proxy';
const STATUS_URL = `${PROXY_BASE}?action=status`;

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
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversas' | 'campanhas' | 'templates'>('conversas');
  
  // Connection states
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(() => {
    return localStorage.getItem('whatsapp_instance_name');
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const { data: mensagens = [], isLoading: loadingMensagens } = getMensagens(
    conversaSelecionada?.id || ''
  );

  // Busca instance_name do Supabase se não tiver no localStorage
  const getInstanceName = useCallback(async (): Promise<string> => {
    // Primeiro tenta localStorage
    const stored = instanceName || localStorage.getItem('whatsapp_instance_name');
    if (stored) {
      return stored;
    }

    // Se não tem, busca do Supabase
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data?.instance_name) {
      console.log('Nenhuma instância ativa encontrada no Supabase');
      return '';
    }

    // Salva no localStorage para próximas chamadas
    localStorage.setItem('whatsapp_instance_name', data.instance_name);
    setInstanceName(data.instance_name);
    return data.instance_name;
  }, [instanceName]);

  const fetchWhatsappStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    
    // Busca instance_name (localStorage ou Supabase)
    const currentInstanceName = await getInstanceName();
    
    console.log('=== INICIANDO VERIFICAÇÃO DE STATUS ===');
    console.log('Instance name:', currentInstanceName || '(vazio)');
    console.log('URL:', STATUS_URL);
    
    try {
      // POST para o proxy com instance_name no body
      const response = await fetch(STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_name: currentInstanceName }),
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Status response:', JSON.stringify(data, null, 2));

      if (!data) {
        setStatusError('Não foi possível verificar o status da conexão.');
        setIsConnected(false);
        return;
      }

      if (data.error) {
        setStatusError(data.error);
        setIsConnected(false);
        return;
      }

      // Atualiza estados conforme resposta
      const connected = data.is_connected === true;
      setIsConnected(connected);
      
      if (data.instance_name) {
        setInstanceName(data.instance_name);
        localStorage.setItem('whatsapp_instance_name', data.instance_name);
      }
      
      if (data.client_slug) {
        localStorage.setItem('whatsapp_client_slug', data.client_slug);
      }
      
    } catch (err) {
      console.error('Erro ao verificar status do WhatsApp:', err);
      setStatusError('Não foi possível verificar o status da conexão.');
      setIsConnected(false);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [getInstanceName]);

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
    localStorage.setItem('whatsapp_instance_name', name);
    setQrDialogOpen(false);
  };

  const tabs = [
    { id: 'conversas' as const, label: 'Conversas', icon: MessageSquare },
    { id: 'campanhas' as const, label: 'Campanhas', icon: Send },
    { id: 'templates' as const, label: 'Templates', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title & Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">WhatsApp</h1>
                  <div className="flex items-center gap-2">
                    {isLoadingStatus && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verificando...
                      </span>
                    )}
                    {!isLoadingStatus && !statusError && isConnected === true && (
                      <span className="flex items-center gap-1.5 text-xs text-primary">
                        <CheckCircle2 className="h-3 w-3" />
                        Conectado {instanceName && `· ${instanceName}`}
                      </span>
                    )}
                    {!isLoadingStatus && !statusError && isConnected === false && (
                      <span className="flex items-center gap-1.5 text-xs text-destructive">
                        <XCircle className="h-3 w-3" />
                        Desconectado
                      </span>
                    )}
                    {statusError && !isLoadingStatus && (
                      <span className="text-xs text-muted-foreground">{statusError}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={fetchWhatsappStatus}
                disabled={isLoadingStatus}
                className="h-8 px-3 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button 
                size="sm"
                onClick={() => setQrDialogOpen(true)}
                disabled={isConnected || isLoadingStatus}
                className="h-8 px-3 text-xs"
              >
                <QrCode className="h-3.5 w-3.5 mr-1.5" />
                Conectar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* KPIs Section */}
      <section className="px-6 py-6 border-b border-border/40">
        <WhatsAppKPIs stats={stats} />
      </section>

      {/* Tab Navigation */}
      <nav className="px-6 py-3 border-b border-border/40">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'conversas' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-320px)]">
            <div className="lg:col-span-4 xl:col-span-3">
              <ConversasList
                conversas={conversas}
                isLoading={loadingConversas}
                onSelectConversa={handleSelecionarConversa}
                selectedConversaId={conversaSelecionada?.id}
                onNovaConversa={() => {}}
              />
            </div>
            <div className="lg:col-span-8 xl:col-span-9">
              <ChatView
                conversa={conversaSelecionada}
                mensagens={mensagens}
                isLoading={loadingMensagens}
                onEnviarMensagem={handleEnviarMensagem}
                onSelecionarTemplate={() => {}}
              />
            </div>
          </div>
        )}

        {activeTab === 'campanhas' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Send className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium mb-1">Campanhas</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Em breve você poderá criar e gerenciar campanhas de mensagens em massa
            </p>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium mb-1">Templates</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Em breve você poderá criar e gerenciar templates de mensagens
            </p>
          </div>
        )}
      </main>

      {/* QR Code Dialog */}
      <GerarQRCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        onConnected={handleConnected}
      />
    </div>
  );
}
