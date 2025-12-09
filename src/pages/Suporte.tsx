import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Send, Plus, HeadphonesIcon } from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const prioridadeColors: Record<string, string> = {
  baixa: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  media: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  alta: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
  urgente: 'bg-destructive/10 text-destructive border-destructive/20'
};

const statusColors: Record<string, string> = {
  aberto: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  em_andamento: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  resolvido: 'bg-primary/10 text-primary border-primary/20',
  fechado: 'bg-muted text-muted-foreground border-border'
};

export default function Suporte() {
  const { tickets, isLoading, criarTicket } = useTickets();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    assunto: '',
    descricao: '',
    prioridade: 'media' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await criarTicket(formData);
    setFormData({ assunto: '', descricao: '', prioridade: 'media' });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <HeadphonesIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Suporte</h1>
            <p className="text-sm text-muted-foreground">Chamados e solicitações</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Novo Chamado
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Chamado</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="assunto" className="text-sm">Assunto</Label>
                <Input
                  id="assunto"
                  value={formData.assunto}
                  onChange={(e) => setFormData({...formData, assunto: e.target.value})}
                  placeholder="Descreva brevemente"
                  className="mt-1.5 rounded-xl"
                  required
                />
              </div>

              <div>
                <Label htmlFor="prioridade" className="text-sm">Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value: any) => setFormData({...formData, prioridade: value})}
                >
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="descricao" className="text-sm">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  rows={5}
                  placeholder="Descreva o problema detalhadamente"
                  className="mt-1.5 rounded-xl resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-xl">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Table */}
      <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <HeadphonesIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum chamado</p>
            <p className="text-xs mt-1">Clique em "Novo Chamado" para abrir</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="font-medium">Assunto</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Prioridade</TableHead>
                <TableHead className="font-medium">Abertura</TableHead>
                <TableHead className="font-medium">Atualização</TableHead>
                <TableHead className="font-medium">Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} className="border-border/30 hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium">{ticket.assunto}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                        {ticket.descricao}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[ticket.status]}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={prioridadeColors[ticket.prioridade]}>
                      {ticket.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(ticket.data_abertura).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(ticket.ultima_atualizacao).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ticket.responsavel || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}