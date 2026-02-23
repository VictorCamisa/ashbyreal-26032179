import { useState, useEffect } from 'react';
import { Settings, ArrowLeft, Send, Wifi, WifiOff, ChevronDown, LayoutDashboard, Bot } from 'lucide-react';
import { InstanceSettings } from '@/components/whatsapp/InstanceSettings';
import { SystemAssistant } from '@/components/assistant/SystemAssistant';
import { useAssistant } from '@/contexts/AssistantContext';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ChatPanel } from '@/components/whatsapp/ChatPanel';
import { DisparoPanel } from '@/components/whatsapp/DisparoPanel';
import { TestarAgenteDialog } from '@/components/agentes/TestarAgenteDialog';
import { useWhatsAppInstances, type WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function WhatsApp() {
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showDisparo, setShowDisparo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTestarAgente, setShowTestarAgente] = useState(false);
  const [activeAgent, setActiveAgent] = useState<any>(null);

  const { getModuleInfo } = useAssistant();
  const moduleInfo = getModuleInfo('/whatsapp');

  const { instances } = useWhatsAppInstances();
  const { conversations, loadingConversations, getMessages, sendMessage } = useWhatsAppMessages(
    selectedInstance?.id || null
  );

  // Auto-select first connected instance
  useEffect(() => {
    if (!selectedInstance && instances && instances.length > 0) {
      const connectedInstance = instances.find(i => i.status === 'connected');
      if (connectedInstance) {
        setSelectedInstance(connectedInstance);
      }
    }
  }, [instances, selectedInstance]);

  // Fetch active agent for connected instance
  useEffect(() => {
    const fetchActiveAgent = async () => {
      if (!selectedInstance?.id) {
        setActiveAgent(null);
        return;
      }

      const { data } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('instance_id', selectedInstance.id)
        .eq('is_active', true)
        .maybeSingle();

      setActiveAgent(data);
    };

    fetchActiveAgent();
  }, [selectedInstance?.id]);

  const selectedConversation = conversations.find((c) => c.remote_jid === selectedJid) || null;

  const { data: messages = [], isLoading: loadingMessages } = getMessages(selectedConversation);

  const handleSelectConversation = (jid: string) => {
    setSelectedJid(jid);
    setMobileShowChat(true);
  };

  const handleBackToList = () => {
    setMobileShowChat(false);
  };

  const handleSendMessage = async (message: string, messageType: string = 'text', mediaUrl?: string) => {
    if (!selectedInstance || !selectedConversation) return;

    try {
      await sendMessage.mutateAsync({
        instanceName: selectedInstance.instance_name,
        remoteJid: selectedConversation.remote_jid,
        message,
        messageType,
        mediaUrl,
      });
    } catch {
      // Error toast is handled inside the mutation
    }
  };

  const connectedInstances = instances?.filter(i => i.status === 'connected') || [];
  const hasConnectedInstance = connectedInstances.length > 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#111B21]">
      {/* Top Header Bar */}
      <div className="h-14 bg-[#202C33] border-b border-[#2A3942] flex items-center justify-between px-4 shrink-0">
        {/* Left - Logo & Back */}
        <div className="flex items-center gap-3">
          <Link 
            to="/dashboard" 
            className="flex items-center gap-2 text-[#AEBAC1] hover:text-white transition-colors"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="hidden sm:inline text-sm font-medium">Voltar</span>
          </Link>
          <div className="h-6 w-px bg-[#2A3942] hidden sm:block" />
          <h1 className="text-lg font-semibold text-[#E9EDEF] flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#25D366]" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="hidden sm:inline">WhatsApp</span>
          </h1>
        </div>

        {/* Center - Instance Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-9 px-3 gap-2 text-[#E9EDEF] hover:bg-[#2A3942] max-w-[200px]"
            >
              {selectedInstance ? (
                <>
                  <Wifi className="h-4 w-4 text-[#00A884] shrink-0" />
                  <span className="truncate">{selectedInstance.name}</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-[#8696A0] shrink-0" />
                  <span className="text-[#8696A0]">Selecionar instância</span>
                </>
              )}
              <ChevronDown className="h-4 w-4 text-[#8696A0] shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56 bg-[#202C33] border-[#2A3942]">
            {connectedInstances.length > 0 ? (
              connectedInstances.map(instance => (
                <DropdownMenuItem 
                  key={instance.id}
                  onClick={() => setSelectedInstance(instance)}
                  className="text-[#E9EDEF] focus:bg-[#2A3942] focus:text-[#E9EDEF] cursor-pointer"
                >
                  <Wifi className="h-4 w-4 text-[#00A884] mr-2" />
                  <span className="truncate">{instance.name}</span>
                  {instance.phone_number && (
                    <span className="ml-auto text-xs text-[#8696A0]">{instance.phone_number}</span>
                  )}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled className="text-[#8696A0]">
                Nenhuma instância conectada
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-[#2A3942]" />
            <DropdownMenuItem 
              onClick={() => setShowSettings(true)}
              className="text-[#8696A0] focus:bg-[#2A3942] focus:text-[#E9EDEF] cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar instâncias
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {activeAgent && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowTestarAgente(true)}
              className="h-9 px-3 gap-2 text-[#8696A0] hover:text-white hover:bg-[#2A3942]"
            >
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Testar</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowDisparo(true)}
            disabled={!hasConnectedInstance}
            className="h-9 px-3 gap-2 text-[#00A884] hover:text-[#00A884] hover:bg-[#00A884]/10"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Disparo</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowSettings(true)}
            className="h-9 w-9 text-[#8696A0] hover:text-white hover:bg-[#2A3942]"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Conversations */}
        <div className={cn(
          "w-full md:w-[380px] lg:w-[420px] md:min-w-[320px] md:max-w-[500px] border-r border-[#2A3942] flex flex-col bg-[#111B21]",
          "md:flex",
          mobileShowChat ? "hidden" : "flex"
        )}>
          {!hasConnectedInstance ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#202C33] flex items-center justify-center mb-6">
                <WifiOff className="h-10 w-10 text-[#8696A0]" />
              </div>
              <h3 className="text-lg font-semibold text-[#E9EDEF] mb-2">
                Nenhuma instância conectada
              </h3>
              <p className="text-sm text-[#8696A0] mb-6 max-w-xs">
                Conecte uma instância do WhatsApp para começar a usar o chat e disparos em massa.
              </p>
              <Button 
                onClick={() => setShowSettings(true)}
                className="bg-[#00A884] hover:bg-[#00A884]/90 text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar Instância
              </Button>
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              isLoading={loadingConversations}
              selectedJid={selectedJid}
              onSelect={handleSelectConversation}
            />
          )}
        </div>

        {/* Right Panel - Chat */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 bg-[#0B141A]",
          "md:flex",
          mobileShowChat ? "flex" : "hidden"
        )}>
          {/* Mobile back button - positioned safely below notch */}
          {mobileShowChat && selectedConversation && (
            <button
              onClick={handleBackToList}
              className="md:hidden absolute top-2 left-2 z-50 p-2.5 bg-[#202C33] rounded-full text-[#AEBAC1] hover:text-white hover:bg-[#2A3942] transition-colors shadow-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          
          <ChatPanel
            conversation={selectedConversation}
            messages={messages}
            isLoading={loadingMessages}
            onSendMessage={handleSendMessage}
            isSending={sendMessage.isPending}
          />
        </div>
      </div>

      {/* Settings Sheet */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 bg-[#111B21] border-[#2A3942] overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-[#2A3942]">
            <DialogTitle className="text-xl text-[#E9EDEF]">Configurações</DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            <InstanceSettings
              onInstanceSelect={setSelectedInstance}
              selectedInstance={selectedInstance}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Disparo Panel (fullscreen overlay) */}
      {showDisparo && (
        <div className="fixed inset-0 z-50 bg-[#111B21]">
          <DisparoPanel onClose={() => setShowDisparo(false)} />
        </div>
      )}

      {/* Testar Agente Dialog */}
      {activeAgent && (
        <TestarAgenteDialog
          agent={activeAgent}
          open={showTestarAgente}
          onOpenChange={setShowTestarAgente}
        />
      )}

      {/* System Assistant */}
      <SystemAssistant 
        moduleName={moduleInfo.name} 
        moduleContext={moduleInfo.context} 
      />
    </div>
  );
}
