import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { mockClientes } from '@/data/clientes.mock';

const statusColors = {
  ativo: 'bg-green-500',
  inativo: 'bg-gray-500',
  lead: 'bg-yellow-500'
};

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredClientes = mockClientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Base Central de Clientes</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Ticket Médio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Data Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClientes.map((cliente) => (
              <TableRow
                key={cliente.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/cliente/${cliente.id}`)}
              >
                <TableCell className="font-medium">{cliente.nome}</TableCell>
                <TableCell>{cliente.telefone}</TableCell>
                <TableCell>{cliente.email}</TableCell>
                <TableCell>
                  R$ {cliente.ticketMedio.toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[cliente.status]}>
                    {cliente.status}
                  </Badge>
                </TableCell>
                <TableCell>{cliente.origem}</TableCell>
                <TableCell>
                  {new Date(cliente.dataCadastro).toLocaleDateString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Mostrando {filteredClientes.length} de {mockClientes.length} clientes</p>
      </div>
    </div>
  );
}
