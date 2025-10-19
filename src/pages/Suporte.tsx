import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Send } from 'lucide-react';
import { mockTickets } from '@/data/suporte.mock';
import { useToast } from '@/hooks/use-toast';

const prioridadeColors = {
  baixa: 'bg-blue-500',
  media: 'bg-yellow-500',
  alta: 'bg-orange-500',
  urgente: 'bg-red-500'
};

const statusColors = {
  aberto: 'bg-blue-500',
  em_andamento: 'bg-yellow-500',
  resolvido: 'bg-green-500',
  fechado: 'bg-gray-500'
};

export default function Suporte() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    assunto: '',
    descricao: '',
    prioridade: 'media' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Ticket enviado:', formData);
    toast({
      title: 'Ticket enviado com sucesso!',
      description: 'Nossa equipe entrará em contato em breve.',
    });
    setFormData({
      nome: '',
      email: '',
      assunto: '',
      descricao: '',
      prioridade: 'media'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Suporte</h1>
        <p className="text-muted-foreground">Central de Atendimento Ashby</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Abrir Novo Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="assunto">Assunto *</Label>
                <Input
                  id="assunto"
                  value={formData.assunto}
                  onChange={(e) => setFormData({...formData, assunto: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value: any) => setFormData({...formData, prioridade: value})}
                >
                  <SelectTrigger>
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
                <Label htmlFor="descricao">Descrição do Problema *</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  rows={5}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Enviar Solicitação
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{ticket.assunto}</p>
                      <p className="text-sm text-muted-foreground">{ticket.nome}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={prioridadeColors[ticket.prioridade]}>
                        {ticket.prioridade}
                      </Badge>
                      <Badge className={statusColors[ticket.status]}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Aberto em: {new Date(ticket.dataAbertura).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Completa */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Data Abertura</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono">#{ticket.id}</TableCell>
                  <TableCell className="font-medium">{ticket.assunto}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[ticket.status]}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={prioridadeColors[ticket.prioridade]}>
                      {ticket.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.dataAbertura).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>{ticket.responsavel || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
