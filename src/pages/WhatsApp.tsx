import { useState } from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { InstanceSettings } from '@/components/whatsapp/InstanceSettings';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ChatPanel } from '@/components/whatsapp/ChatPanel';
import { useWhatsAppInstances, type WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const { instances } = useWhatsAppInstances();
  const { conversations, loadingConversations, getMessages, sendMessage } = useWhatsAppMessages(
    selectedInstance?.id || null
  );

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

  return (
    <div className="fixed inset-0 flex bg-[#111B21]">
      {/* Left Panel - Conversations */}
      <div className={cn(
        "w-full md:w-[380px] lg:w-[420px] md:min-w-[320px] md:max-w-[500px] border-r border-[#2A3942] flex flex-col bg-[#111B21]",
        "md:flex",
        mobileShowChat ? "hidden" : "flex"
      )}>
        <ConversationList
          conversations={conversations}
          isLoading={loadingConversations}
          selectedJid={selectedJid}
          onSelect={handleSelectConversation}
        />
        
        {/* Settings button at bottom */}
        <div className="p-3 border-t border-[#2A3942]">
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#202C33] h-11"
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">Configurações</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-[480px] bg-[#111B21] border-[#2A3942] p-0">
              <SheetHeader className="px-6 py-4 border-b border-[#2A3942]">
                <SheetTitle className="text-xl text-[#E9EDEF]">Configurações</SheetTitle>
              </SheetHeader>
              <div className="p-6 overflow-y-auto h-[calc(100vh-80px)]">
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
      <div className={cn(
        "flex-1 flex flex-col min-w-0 bg-[#0B141A]",
        "md:flex",
        mobileShowChat ? "flex" : "hidden"
      )}>
        {/* Mobile back button */}
        {mobileShowChat && selectedConversation && (
          <button
            onClick={handleBackToList}
            className="md:hidden absolute top-4 left-4 z-50 p-2 bg-[#202C33] rounded-full text-[#AEBAC1] hover:text-white hover:bg-[#2A3942] transition-colors"
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
  );
}