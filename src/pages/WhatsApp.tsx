import { useState } from 'react';
import { Settings } from 'lucide-react';
import { InstanceSettings } from '@/components/whatsapp/InstanceSettings';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ChatPanel } from '@/components/whatsapp/ChatPanel';
import { useWhatsAppInstances, type WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function WhatsApp() {
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);

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
      // Error toast is handled inside the mutation
    }
  };

  return (
    <div className="fixed inset-0 flex bg-[#111B21]">
      {/* Left Panel - Conversations */}
      <div className="w-[420px] min-w-[320px] max-w-[520px] border-r border-[#222D34] flex flex-col bg-[#111B21]">
        <ConversationList
          conversations={conversations}
          isLoading={loadingConversations}
          selectedJid={selectedJid}
          onSelect={setSelectedJid}
        />
        
        {/* Settings button at bottom */}
        <div className="p-2 border-t border-[#222D34]">
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-[#8696A0] hover:bg-[#202C33]"
              >
                <Settings className="h-5 w-5" />
                Configurações
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] sm:w-[540px] bg-[#111B21] border-[#222D34]">
              <SheetHeader>
                <SheetTitle className="text-[#E9EDEF]">Configurações do WhatsApp</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <InstanceSettings
                  onInstanceSelect={setSelectedInstance}
                  selectedInstance={selectedInstance}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatPanel
          conversation={selectedConversation}
          messages={messages}
          isLoading={loadingMessages}
          onSendMessage={handleSendMessage}
          isSending={sendMessage.isPending}
        />
      </div>
    </div>
  );
}
