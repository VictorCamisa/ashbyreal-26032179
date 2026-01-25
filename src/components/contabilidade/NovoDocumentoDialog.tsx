import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Plus, Search } from 'lucide-react';
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
import { useDocumentoFiscalMutations, DocumentoFiscalTipo, DocumentoFiscalDirecao } from '@/hooks/useContabilidade';
import { useClientes } from '@/hooks/useClientes';
import { useLojistas } from '@/hooks/useLojistas';
import { useEntities } from '@/hooks/useEntities';

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

export function NovoDocumentoDialog({ open, onOpenChange }: NovoDocumentoDialogProps) {
  const [direcao, setDirecao] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const { createDocumento } = useDocumentoFiscalMutations();
  const { clientes } = useClientes();
  const { lojistas } = useLojistas();
  const { data: entities } = useEntities();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: 'NFE',
      direcao: 'SAIDA',
      natureza_operacao: 'Venda de mercadoria',
      valor_produtos: 0,
      valor_servicos: 0,
      valor_desconto: 0,
      valor_frete: 0,
      serie: '1',
    },
  });

  const onSubmit = (data: FormData) => {
    const valorTotal = 
      (data.valor_produtos || 0) + 
      (data.valor_servicos || 0) + 
      (data.valor_frete || 0) - 
      (data.valor_desconto || 0);

    createDocumento.mutate({
      ...data,
      valor_total: valorTotal,
      status: data.numero ? 'EMITIDA' : 'RASCUNHO',
      data_emissao: data.numero ? new Date().toISOString() : undefined,
    } as any, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      }
    });
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
            Registre um novo documento fiscal ou nota já emitida externamente.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NFE">NF-e (Produto)</SelectItem>
                        <SelectItem value="NFSE">NFS-e (Serviço)</SelectItem>
                        <SelectItem value="CFE_SAT">CF-e / SAT</SelectItem>
                        <SelectItem value="NFCE">NFC-e (Consumidor)</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes?.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createDocumento.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Salvar Documento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
