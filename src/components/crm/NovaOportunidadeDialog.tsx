import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { ScrollArea } from '@/components/ui/scroll-area';

const oportunidadeSchema = z.object({
  cliente_id: z.string().min(1, 'Selecione um cliente'),
  origem: z.enum(['WhatsApp', 'Facebook', 'Instagram', 'Indicação', 'Site', 'Outros']),
  status: z.enum(['novo_lead', 'qualificado', 'negociacao', 'fechado', 'perdido']),
  valor_estimado: z.string().optional(),
  observacoes: z.string().optional(),
  responsavel: z.string().optional(),
});

type OportunidadeFormData = z.infer<typeof oportunidadeSchema>;

interface NovaOportunidadeDialogProps {
  onSubmit: (data: any) => void;
  isCreating: boolean;
}

export function NovaOportunidadeDialog({ onSubmit, isCreating }: NovaOportunidadeDialogProps) {
  const [open, setOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const { clientes } = useClientes();

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.telefone.includes(clienteSearch)
  );

  const form = useForm<OportunidadeFormData>({
    resolver: zodResolver(oportunidadeSchema),
    defaultValues: {
      cliente_id: '',
      origem: 'WhatsApp',
      status: 'novo_lead',
      valor_estimado: '',
      observacoes: '',
      responsavel: '',
    },
  });

  const selectedClienteId = form.watch('cliente_id');
  const selectedCliente = clientes.find(c => c.id === selectedClienteId);

  const handleSubmit = (data: OportunidadeFormData) => {
    const cliente = clientes.find(c => c.id === data.cliente_id);
    if (!cliente) return;

    const valorEstimado = data.valor_estimado 
      ? parseFloat(data.valor_estimado.replace(/[^\d,]/g, '').replace(',', '.'))
      : 0;

    onSubmit({
      cliente_id: data.cliente_id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email || null,
      origem: data.origem,
      status: data.status,
      valor_estimado: valorEstimado,
      observacoes: data.observacoes,
      responsavel: data.responsavel,
    });
    form.reset();
    setClienteSearch('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { form.reset(); setClienteSearch(''); } }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Oportunidade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
          <DialogDescription>
            Selecione um cliente e crie uma nova oportunidade de negócio
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Cliente Selection */}
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar cliente por nome ou telefone..."
                        value={clienteSearch}
                        onChange={(e) => setClienteSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {selectedCliente ? (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedCliente.nome}</p>
                          <p className="text-sm text-muted-foreground">{selectedCliente.telefone}</p>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => field.onChange('')}
                        >
                          Alterar
                        </Button>
                      </div>
                    ) : (
                      <ScrollArea className="h-[150px] border rounded-lg">
                        {filteredClientes.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {clienteSearch ? 'Nenhum cliente encontrado' : 'Digite para buscar clientes'}
                          </div>
                        ) : (
                          <div className="p-1">
                            {filteredClientes.slice(0, 20).map((cliente) => (
                              <button
                                key={cliente.id}
                                type="button"
                                onClick={() => { field.onChange(cliente.id); setClienteSearch(''); }}
                                className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                              >
                                <p className="font-medium text-sm">{cliente.nome}</p>
                                <p className="text-xs text-muted-foreground">{cliente.telefone}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="origem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                        <SelectItem value="Indicação">Indicação</SelectItem>
                        <SelectItem value="Site">Site</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do responsável" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="novo_lead">Nova</SelectItem>
                        <SelectItem value="qualificado">Qualificada</SelectItem>
                        <SelectItem value="negociacao">Em Negociação</SelectItem>
                        <SelectItem value="fechado">Fechada</SelectItem>
                        <SelectItem value="perdido">Perdida</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_estimado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Estimado</FormLabel>
                    <FormControl>
                      <Input placeholder="R$ 0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre a oportunidade"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="success" disabled={isCreating || !selectedCliente}>
                {isCreating ? 'Salvando...' : 'Criar Oportunidade'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
