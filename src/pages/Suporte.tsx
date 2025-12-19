import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
import { Send, Plus, HeadphonesIcon, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import { PageLayout } from '@/components/layout/PageLayout';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const prioridadeColors: Record<string, string> = {
  baixa: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  urgente: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
};

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  em_andamento: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  resolvido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
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

  const abertos = tickets.filter(t => t.status === 'aberto').length;
  const emAndamento = tickets.filter(t => t.status === 'em_andamento').length;
  const resolvidos = tickets.filter(t => t.status === 'resolvido').length;

  return (
    <PageLayout
      title="Suporte"
      subtitle="Chamados e solicitações"
      icon={HeadphonesIcon}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" />
              Novo Chamado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
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
                  <SelectContent>
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
                  className="mt-1.5 resize-none rounded-xl"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" variant="success" className="rounded-xl gap-2">
                  <Send className="h-4 w-4" />
                  Enviar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        {/* KPIs */}
        <KPIGrid>
          <KPICard label="Total" value={tickets.length} icon={HeadphonesIcon} />
          <KPICard label="Abertos" value={abertos} icon={AlertCircle} variant="warning" />
          <KPICard label="Em Andamento" value={emAndamento} icon={Clock} />
          <KPICard label="Resolvidos" value={resolvidos} icon={CheckCircle} variant="success" />
        </KPIGrid>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <HeadphonesIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum chamado</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Chamado" para abrir</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
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
                    <TableRow key={ticket.id} className="hover:bg-muted/30">
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
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
