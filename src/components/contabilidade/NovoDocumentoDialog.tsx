import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Plus, Send, Loader2, Search, UserPlus, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocumentoFiscalMutations } from '@/hooks/useContabilidade';
import { useClientes } from '@/hooks/useClientes';
import { useLojistas } from '@/hooks/useLojistas';
import { useEntities } from '@/hooks/useEntities';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  tipo: z.enum(['NFE', 'NFSE', 'CFE_SAT', 'NFCE']),
  direcao: z.enum(['ENTRADA', 'SAIDA']),
  razao_social: z.string().optional(),
  cnpj_cpf: z.string().optional(),
  cliente_id: z.string().optional(),
  lojista_id: z.string().optional(),
  entity_id: z.string().optional(),
  natureza_operacao: z.string().min(1, 'Natureza da operação é obrigatória'),
  valor_produtos: z.coerce.number().min(0),
  valor_servicos: z.coerce.number().min(0),
  valor_desconto: z.coerce.number().min(0),
  valor_frete: z.coerce.number().min(0),
  numero: z.string().optional(),
  serie: z.string().optional(),
  chave_acesso: z.string().optional(),
  informacoes_adicionais: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NovoDocumentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Inline Client Picker ───
function ClientePicker({ 
  value, 
  onChange, 
  clientes 
}: { 
  value?: string; 
  onChange: (id: string) => void; 
  clientes: any[];
}) {
  const [mode, setMode] = useState<'search' | 'create' | 'selected'>(() => value ? 'selected' : 'search');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCliente, setNewCliente] = useState({ nome: '', telefone: '', email: '', cpf_cnpj: '' });

  const selectedCliente = useMemo(() => 
    clientes?.find(c => c.id === value), [clientes, value]
  );

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return clientes?.slice(0, 8) || [];
    const term = searchTerm.toLowerCase();
    return (clientes || []).filter(c => 
      c.nome?.toLowerCase().includes(term) || 
      c.telefone?.includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.cpfCnpj?.includes(term)
    ).slice(0, 8);
  }, [clientes, searchTerm]);

  const handleCreate = async () => {
    if (!newCliente.nome || !newCliente.telefone) {
      toast({ title: 'Nome e telefone são obrigatórios', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.from('clientes').insert({
        nome: newCliente.nome,
        telefone: newCliente.telefone,
        email: newCliente.email || `${newCliente.telefone}@temp.com`,
        cpf_cnpj: newCliente.cpf_cnpj || null,
        origem: 'manual',
        status: 'ativo',
      }).select().single();

      if (error) throw error;
      onChange(data.id);
      setMode('selected');
      toast({ title: '✅ Cliente criado com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao criar cliente', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  // Selected state
  if (mode === 'selected' && selectedCliente) {
    return (
      <div className="flex items-center gap-2 border rounded-md p-2 bg-muted/30">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{selectedCliente.nome}</p>
          <p className="text-xs text-muted-foreground truncate">
            {selectedCliente.telefone} {selectedCliente.cpfCnpj && `• ${selectedCliente.cpfCnpj}`}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { onChange(''); setMode('search'); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Create mode
  if (mode === 'create') {
    return (
      <div className="border rounded-md p-3 space-y-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <UserPlus className="h-4 w-4" /> Novo Cliente
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode('search')}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancelar
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input 
            placeholder="Nome *" 
            value={newCliente.nome} 
            onChange={e => setNewCliente(p => ({ ...p, nome: e.target.value }))} 
          />
          <Input 
            placeholder="Telefone *" 
            value={newCliente.telefone} 
            onChange={e => setNewCliente(p => ({ ...p, telefone: e.target.value }))} 
          />
          <Input 
            placeholder="E-mail" 
            value={newCliente.email} 
            onChange={e => setNewCliente(p => ({ ...p, email: e.target.value }))} 
          />
          <Input 
            placeholder="CPF/CNPJ" 
            value={newCliente.cpf_cnpj} 
            onChange={e => setNewCliente(p => ({ ...p, cpf_cnpj: e.target.value }))} 
          />
        </div>
        <Button type="button" size="sm" onClick={handleCreate} disabled={isCreating} className="w-full">
          {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          {isCreating ? 'Criando...' : 'Criar e Selecionar'}
        </Button>
      </div>
    );
  }

  // Search mode (default)
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, CPF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => setMode('create')} title="Criar novo cliente">
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>
      {(searchTerm || filtered.length > 0) && (
        <ScrollArea className="max-h-40 border rounded-md">
          <div className="p-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Nenhum cliente encontrado.{' '}
                <button type="button" className="text-primary underline" onClick={() => setMode('create')}>
                  Criar novo
                </button>
              </div>
            ) : (
              filtered.map(cliente => (
                <button
                  key={cliente.id}
                  type="button"
                  className="w-full text-left p-2 rounded hover:bg-accent/50 transition-colors flex items-center gap-2"
                  onClick={() => { onChange(cliente.id); setMode('selected'); setSearchTerm(''); }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cliente.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cliente.telefone}
                      {cliente.cpfCnpj && ` • ${cliente.cpfCnpj}`}
                    </p>
                  </div>
                  {cliente.cpfCnpj && <Badge variant="outline" className="text-[10px] shrink-0">CPF/CNPJ</Badge>}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Main Dialog ───
export function NovoDocumentoDialog({ open, onOpenChange }: NovoDocumentoDialogProps) {
  const [direcao, setDirecao] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [isEmitting, setIsEmitting] = useState(false);
  const { createDocumento } = useDocumentoFiscalMutations();
  const { clientes } = useClientes();
  const { lojistas } = useLojistas();
  const { data: entities } = useEntities();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: 'NFCE',
      direcao: 'SAIDA',
      natureza_operacao: 'Venda de mercadoria',
      valor_produtos: 0,
      valor_servicos: 0,
      valor_desconto: 0,
      valor_frete: 0,
      serie: '1',
    },
  });

  const tipoAtual = form.watch('tipo');

  const buildPayload = (data: FormData) => {
    const valorTotal = 
      (data.valor_produtos || 0) + 
      (data.valor_servicos || 0) + 
      (data.valor_frete || 0) - 
      (data.valor_desconto || 0);

    return {
      ...data,
      valor_total: valorTotal,
      valor_outras: 0,
    };
  };

  const onSubmit = (data: FormData) => {
    const payload = buildPayload(data);
    createDocumento.mutate({
      ...payload,
      status: data.numero ? 'EMITIDA' : 'RASCUNHO',
      data_emissao: data.numero ? new Date().toISOString() : undefined,
    } as any, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      }
    });
  };

  const onSaveAndEmit = async (data: FormData) => {
    const payload = buildPayload(data);
    setIsEmitting(true);
    
    try {
      const { data: doc, error: docErr } = await supabase
        .from('documentos_fiscais')
        .insert({
          ...payload,
          status: 'RASCUNHO',
          valor_outras: 0,
        } as any)
        .select()
        .single();

      if (docErr) throw docErr;

      if (payload.valor_produtos > 0) {
        await supabase.from('documento_fiscal_itens').insert({
          documento_id: doc.id,
          descricao: payload.natureza_operacao || 'Produto',
          quantidade: 1,
          valor_unitario: payload.valor_produtos,
          valor_total: payload.valor_produtos,
          unidade: 'UN',
          ncm: '22030000',
          cfop: '5102',
        });
      }

      const action = data.tipo === 'NFCE' ? 'emitir_nfce' : 'emitir_nfe';
      const { data: focusData, error: focusErr } = await supabase.functions.invoke('focus-nfe', {
        body: { action, documento_id: doc.id, ambiente: 'PRODUCAO' },
      });

      if (focusErr) throw new Error(focusErr.message);
      if (focusData && !focusData.success) throw new Error(focusData.error);

      toast({ 
        title: `🧾 ${data.tipo === 'NFCE' ? 'NFC-e' : 'NF-e'} emitida com sucesso!`,
        description: focusData?.chave_nfe ? `Chave: ${focusData.chave_nfe.substring(0, 20)}...` : undefined,
      });

      if (focusData?.danfe_url) {
        window.open(focusData.danfe_url, '_blank');
      }

      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      console.error('Erro ao emitir:', err);
      toast({ title: 'Erro ao emitir documento', description: err.message, variant: 'destructive' });
    } finally {
      setIsEmitting(false);
    }
  };

  const handleDirecaoChange = (value: 'ENTRADA' | 'SAIDA') => {
    setDirecao(value);
    form.setValue('direcao', value);
    if (value === 'SAIDA') {
      form.setValue('natureza_operacao', 'Venda de mercadoria');
    } else {
      form.setValue('natureza_operacao', 'Compra para comercialização');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Novo Documento Fiscal
          </DialogTitle>
          <DialogDescription>
            Crie um documento e emita diretamente via Focus NFe, ou registre uma nota já emitida.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={direcao} onValueChange={(v) => handleDirecaoChange(v as 'ENTRADA' | 'SAIDA')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="SAIDA">Nota de Saída</TabsTrigger>
            <TabsTrigger value="ENTRADA">Nota de Entrada</TabsTrigger>
          </TabsList>
        </Tabs>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NFCE">NFC-e (Cupom Fiscal)</SelectItem>
                        <SelectItem value="NFE">NF-e (Nota Fiscal)</SelectItem>
                        <SelectItem value="NFSE">NFS-e (Serviço)</SelectItem>
                        <SelectItem value="CFE_SAT">CF-e / SAT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entity_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entities?.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Destinatário / Emitente */}
            {direcao === 'SAIDA' ? (
              <FormField
                control={form.control}
                name="cliente_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (Destinatário)</FormLabel>
                    <FormControl>
                      <ClientePicker
                        value={field.value}
                        onChange={field.onChange}
                        clientes={clientes || []}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="razao_social"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social (Emitente)</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do fornecedor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnpj_cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ/CPF</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0001-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="natureza_operacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Natureza da Operação</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="valor_produtos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produtos</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_servicos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviços</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_frete"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frete</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_desconto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desconto</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dados da NF já emitida (opcional) */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3 text-muted-foreground">
                Dados da NF (preencher se já emitida externamente)
              </p>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="001234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Série</FormLabel>
                      <FormControl>
                        <Input placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="chave_acesso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chave de Acesso</FormLabel>
                      <FormControl>
                        <Input placeholder="44 dígitos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="informacoes_adicionais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Informações Adicionais</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="secondary" disabled={createDocumento.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Salvar Rascunho
              </Button>
              {direcao === 'SAIDA' && (tipoAtual === 'NFE' || tipoAtual === 'NFCE') && (
                <Button 
                  type="button" 
                  disabled={isEmitting}
                  onClick={form.handleSubmit(onSaveAndEmit)}
                >
                  {isEmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isEmitting ? 'Emitindo...' : `Salvar e Emitir ${tipoAtual === 'NFCE' ? 'NFC-e' : 'NF-e'}`}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
