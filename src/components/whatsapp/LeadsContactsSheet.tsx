import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Search, 
  UserPlus, 
  Phone, 
  Mail,
  MessageCircle,
  Loader2
} from 'lucide-react';
import type { Lead } from '@/types/lead';

interface LeadsContactsSheetProps {
  leads: Lead[];
  isLoading: boolean;
  onStartConversation: (lead: Lead) => void;
  isStarting?: boolean;
}

export function LeadsContactsSheet({ 
  leads, 
  isLoading, 
  onStartConversation,
  isStarting 
}: LeadsContactsSheetProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter(lead => 
      lead.nome.toLowerCase().includes(term) ||
      lead.telefone.includes(term) ||
      (lead.email?.toLowerCase().includes(term))
    );
  }, [leads, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo_lead': return 'bg-blue-500/20 text-blue-500';
      case 'qualificado': return 'bg-purple-500/20 text-purple-500';
      case 'negociacao': return 'bg-amber-500/20 text-amber-500';
      case 'fechado': return 'bg-green-500/20 text-green-500';
      case 'perdido': return 'bg-red-500/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'novo_lead': return 'Novo Lead';
      case 'qualificado': return 'Qualificado';
      case 'negociacao': return 'Negociação';
      case 'fechado': return 'Fechado';
      case 'perdido': return 'Perdido';
      default: return status;
    }
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 
      'bg-orange-500', 'bg-pink-600', 'bg-cyan-600', 'bg-amber-600'
    ];
    return colors[index % colors.length];
  };

  const handleStartConversation = (lead: Lead) => {
    onStartConversation(lead);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          title="Contatos (Leads)"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Iniciar Conversa
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Leads List */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  {leads.length === 0 
                    ? 'Nenhum lead cadastrado' 
                    : 'Nenhum lead encontrado'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLeads.map((lead, index) => (
                  <div 
                    key={lead.id}
                    className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className={`${getAvatarColor(index)} text-white font-medium`}>
                          {lead.nome[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{lead.nome}</p>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(lead.status)}`}>
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.telefone}
                          </span>
                          {lead.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => handleStartConversation(lead)}
                        disabled={isStarting}
                      >
                        {isStarting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageCircle className="h-3.5 w-3.5" />
                        )}
                        Conversar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
