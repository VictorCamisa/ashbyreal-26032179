import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Settings } from 'lucide-react';
import { InstanceSettings } from '@/components/whatsapp/InstanceSettings';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ChatPanel } from '@/components/whatsapp/ChatPanel';
import { useWhatsAppInstances, type WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';

export default function WhatsApp() {
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('conversas');

  const { instances } = useWhatsAppInstances();
  const { conversations, loadingConversations, getMessages, sendMessage } = useWhatsAppMessages(
    selectedInstance?.id || null
  );

  const selectedConversation = conversations.find((c) => c.remote_jid === selectedJid) || null;

  const { data: messages = [], isLoading: loadingMessages } = getMessages(selectedConversation);

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
      // Error toast is handled inside the mutation; avoid breaking the UI with an unhandled rejection.
    }
  };

  return (
    <PageLayout
      title="WhatsApp"
      subtitle="Gerencie suas conversas e instâncias"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-180px)]">
        <TabsList className="mb-4">
          <TabsTrigger value="conversas" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversas
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversas" className="h-full mt-0">
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Conversation List */}
            <div className="col-span-4 border rounded-lg bg-card overflow-hidden">
              <ConversationList
                conversations={conversations}
                isLoading={loadingConversations}
                selectedJid={selectedJid}
                onSelect={setSelectedJid}
              />
            </div>

            {/* Chat Panel */}
            <div className="col-span-8 border rounded-lg bg-card overflow-hidden">
              <ChatPanel
                conversation={selectedConversation}
                messages={messages}
                isLoading={loadingMessages}
                onSendMessage={handleSendMessage}
                isSending={sendMessage.isPending}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="configuracoes" className="mt-0">
          <InstanceSettings
            onInstanceSelect={setSelectedInstance}
            selectedInstance={selectedInstance}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
