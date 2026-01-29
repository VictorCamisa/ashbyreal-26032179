import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Users, 
  MapPin, 
  Plus,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { formatDayMonth } from '@/lib/dateUtils';
import type { Interacao } from '@/types/cliente';

interface ClienteInteracoesTabProps {
  interacoes: Interacao[];
  onCreateInteracao: (data: {
    tipo: string;
    descricao: string;
    responsavel: string;
    data: string;
  }) => Promise<void>;
  isCreating?: boolean;
}

const tipoIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  ligacao: Phone,
  email: Mail,
  reuniao: Users,
  visita: MapPin,
  outros: MessageCircle,
};

const tipoLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  ligacao: 'Ligação',
  email: 'E-mail',
  reuniao: 'Reunião',
  visita: 'Visita',
  outros: 'Outros',
};

const tipoColors: Record<string, string> = {
  whatsapp: 'bg-green-500/10 text-green-500 border-green-500/20',
  ligacao: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  email: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  reuniao: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  visita: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  outros: 'bg-muted text-muted-foreground border-border',
};

export function ClienteInteracoesTab({ 
  interacoes, 
  onCreateInteracao, 
  isCreating 
}: ClienteInteracoesTabProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'whatsapp',
    descricao: '',
    responsavel: '',
    data: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateInteracao({
      ...formData,
      data: new Date(formData.data).toISOString(),
    });
    setOpen(false);
    setFormData({
      tipo: 'whatsapp',
      descricao: '',
      responsavel: '',
      data: new Date().toISOString().split('T')[0],
    });
  };

  const formatDateDisplay = (dateString: string) => {
    try {
      return formatDayMonth(new Date(dateString));
    } catch {
      return 'Data inválida';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Histórico de Interações</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Interação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nova Interação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Interação</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="visita">Visita</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  placeholder="Nome do responsável"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva a interação..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {interacoes.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {interacoes.map((interacao, index) => {
                const Icon = tipoIcons[interacao.tipo] || MessageCircle;
                const color = tipoColors[interacao.tipo] || tipoColors.outros;

                return (
                  <div key={interacao.id} className="relative flex gap-4 pl-2">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2 pb-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={color}>
                          {tipoLabels[interacao.tipo] || interacao.tipo}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateDisplay(interacao.data)} {formatTime(interacao.data)}
                        </span>
                      </div>

                      <p className="text-sm">{interacao.descricao}</p>

                      {interacao.responsavel && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {interacao.responsavel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma interação registrada</p>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar primeira interação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
