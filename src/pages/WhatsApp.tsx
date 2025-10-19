import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MessageSquare, Send, CheckCheck, Clock, TrendingUp } from 'lucide-react';
import { mockCampanhas, mockMensagensWhatsApp } from '@/data/campanhas.mock';

const statusIcons = {
  enviada: Send,
  entregue: CheckCheck,
  lida: CheckCheck,
  respondida: MessageSquare,
  erro: Clock
};

const statusColors = {
  agendada: 'bg-blue-500',
  em_andamento: 'bg-yellow-500',
  concluida: 'bg-green-500',
  cancelada: 'bg-red-500'
};

export default function WhatsApp() {
  const kpis = [
    {
      title: 'Mensagens Enviadas',
      value: mockCampanhas.reduce((acc, c) => acc + c.mensagensEnviadas, 0).toString(),
      icon: Send
    },
    {
      title: 'Taxa de Entrega',
      value: '98.5%',
      icon: CheckCheck
    },
    {
      title: 'Taxa de Resposta',
      value: '32.4%',
      icon: MessageSquare
    },
    {
      title: 'Tempo Médio Resposta',
      value: '2.5h',
      icon: Clock
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp</h1>
        <p className="text-muted-foreground">Monitoramento e Engajamento</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução de Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Gráfico de evolução (em desenvolvimento)
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Campanhas */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas Realizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Enviadas</TableHead>
                <TableHead>Taxa Resposta</TableHead>
                <TableHead>Conversões</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCampanhas.map((campanha) => (
                <TableRow key={campanha.id}>
                  <TableCell className="font-medium">{campanha.nome}</TableCell>
                  <TableCell>
                    {new Date(campanha.data).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>{campanha.publicoAlvo}</TableCell>
                  <TableCell>{campanha.mensagensEnviadas}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-500">
                      {campanha.taxaResposta.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-secondary">
                      {campanha.conversoes}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({campanha.taxaConversao.toFixed(1)}%)
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[campanha.status]}>
                      {campanha.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mensagens Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Mensagens Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockMensagensWhatsApp.map((msg) => {
              const StatusIcon = statusIcons[msg.status];
              return (
                <div key={msg.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <StatusIcon className="h-5 w-5 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{msg.nomeCliente}</p>
                      <Badge variant="outline">{msg.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {msg.mensagem}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(msg.dataHora).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
