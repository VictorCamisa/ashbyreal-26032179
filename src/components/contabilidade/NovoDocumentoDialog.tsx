import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  FileText, Plus, Send, Loader2, Search, UserPlus, Check, X, 
  Trash2, Package, ArrowRight, ArrowLeft, Receipt, Building2,
  User, ShoppingBag, FileCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
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
import { useDocumentoFiscalMutations } from '@/hooks/useContabilidade';
import { useClientes } from '@/hooks/useClientes';
import { useLojistas } from '@/hooks/useLojistas';
import { useEntities } from '@/hooks/useEntities';
import { useProdutos } from '@/hooks/useProdutos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ─── Types ───
interface ItemNF {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  unidade: string;
  ncm: string;
  cfop: string;
  codigo?: string;
  produto_id?: string;
}

const formSchema = z.object({
  tipo: z.enum(['NFE', 'NFSE', 'CFE_SAT', 'NFCE']),
  direcao: z.enum(['ENTRADA', 'SAIDA']),
  razao_social: z.string().optional(),
  cnpj_cpf: z.string().optional(),
  cliente_id: z.string().optional(),
  lojista_id: z.string().optional(),
  entity_id: z.string().optional(),
  natureza_operacao: z.string().min(1, 'Natureza da operação é obrigatória'),
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

// ─── Tipo Card Selector ───
const tipoOptions = [
  { value: 'NFCE', label: 'NFC-e', desc: 'Cupom Fiscal Eletrônico', icon: Receipt },
  { value: 'NFE', label: 'NF-e', desc: 'Nota Fiscal Eletrônica', icon: FileText },
  { value: 'NFSE', label: 'NFS-e', desc: 'Nota Fiscal de Serviço', icon: Building2 },
  { value: 'CFE_SAT', label: 'CF-e/SAT', desc: 'Cupom Fiscal SAT', icon: FileCheck },
] as const;

// ─── Client Picker (improved) ───
function ClientePicker({ value, onChange, clientes }: { value?: string; onChange: (id: string) => void; clientes: any[] }) {
  const [mode, setMode] = useState<'search' | 'create' | 'selected'>(() => value ? 'selected' : 'search');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCliente, setNewCliente] = useState({ nome: '', telefone: '', email: '', cpf_cnpj: '' });

  const selectedCliente = useMemo(() => clientes?.find(c => c.id === value), [clientes, value]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return clientes?.slice(0, 6) || [];
    const term = searchTerm.toLowerCase();
    return (clientes || []).filter(c =>
      c.nome?.toLowerCase().includes(term) ||
      c.telefone?.includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.cpfCnpj?.includes(term)
    ).slice(0, 6);
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
      toast({ title: '✅ Cliente criado!' });
    } catch (err: any) {
      toast({ title: 'Erro ao criar cliente', description: err.message, variant: 'destructive' });
    } finally { setIsCreating(false); }
  };

  if (mode === 'selected' && selectedCliente) {
    return (
      <div className="flex items-center gap-3 border border-primary/20 rounded-xl p-3 bg-primary/5">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{selectedCliente.nome}</p>
          <p className="text-xs text-muted-foreground truncate">
            {selectedCliente.telefone} {selectedCliente.cpf_cnpj && `• ${selectedCliente.cpf_cnpj}`}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => { onChange(''); setMode('search'); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Novo Cliente
          </p>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setMode('search')}>
            Cancelar
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Nome *" value={newCliente.nome} onChange={e => setNewCliente(p => ({ ...p, nome: e.target.value }))} className="text-sm" />
          <Input placeholder="Telefone *" value={newCliente.telefone} onChange={e => setNewCliente(p => ({ ...p, telefone: e.target.value }))} className="text-sm" />
          <Input placeholder="E-mail" value={newCliente.email} onChange={e => setNewCliente(p => ({ ...p, email: e.target.value }))} className="text-sm" />
          <Input placeholder="CPF/CNPJ" value={newCliente.cpf_cnpj} onChange={e => setNewCliente(p => ({ ...p, cpf_cnpj: e.target.value }))} className="text-sm" />
        </div>
        <Button type="button" size="sm" onClick={handleCreate} disabled={isCreating} className="w-full">
          {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          {isCreating ? 'Criando...' : 'Criar e Selecionar'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente por nome, telefone, CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => setMode('create')} title="Criar novo cliente">
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>
      {(searchTerm || filtered.length > 0) && (
        <ScrollArea className="max-h-36 border rounded-xl">
          <div className="p-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Nenhum encontrado.{' '}
                <button type="button" className="text-primary font-medium underline" onClick={() => setMode('create')}>Criar novo</button>
              </div>
            ) : filtered.map(c => (
              <button key={c.id} type="button" className="w-full text-left p-2.5 rounded-lg hover:bg-accent/50 transition-colors flex items-center gap-2.5" onClick={() => { onChange(c.id); setMode('selected'); setSearchTerm(''); }}>
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.telefone}{c.cpf_cnpj && ` • ${c.cpf_cnpj}`}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Item Manager ───
function ItemManager({ items, onChange }: { items: ItemNF[]; onChange: (items: ItemNF[]) => void }) {
  const { produtos } = useProdutos();
  const [showAdd, setShowAdd] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [newItem, setNewItem] = useState<Partial<ItemNF>>({ descricao: '', quantidade: 1, valor_unitario: 0, unidade: 'UN', ncm: '22030000', cfop: '5102' });

  const filteredProds = useMemo(() => {
    if (!prodSearch.trim()) return (produtos || []).slice(0, 6);
    const t = prodSearch.toLowerCase();
    return (produtos || []).filter(p => p.nome?.toLowerCase().includes(t) || p.sku?.toLowerCase().includes(t)).slice(0, 6);
  }, [produtos, prodSearch]);

  const addItem = (override?: Partial<ItemNF>) => {
    const item = { ...newItem, ...override };
    if (!item.descricao || !item.valor_unitario) {
      toast({ title: 'Preencha descrição e valor', variant: 'destructive' });
      return;
    }
    const id = crypto.randomUUID();
    onChange([...items, { id, descricao: item.descricao!, quantidade: item.quantidade || 1, valor_unitario: item.valor_unitario!, unidade: item.unidade || 'UN', ncm: item.ncm || '22030000', cfop: item.cfop || '5102', codigo: item.codigo, produto_id: item.produto_id }]);
    setNewItem({ descricao: '', quantidade: 1, valor_unitario: 0, unidade: 'UN', ncm: '22030000', cfop: '5102' });
    setShowAdd(false);
    setProdSearch('');
  };

  const addFromProduct = (prod: any) => {
    addItem({
      descricao: prod.nome,
      valor_unitario: prod.preco || 0,
      quantidade: 1,
      codigo: prod.sku || undefined,
      produto_id: prod.id,
      unidade: prod.unidade_medida || 'UN',
    });
  };

  const removeItem = (id: string) => onChange(items.filter(i => i.id !== id));
  const updateItem = (id: string, field: keyof ItemNF, value: any) => {
    onChange(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const totalItens = items.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Itens da Nota</span>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        {!showAdd && (
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar Item
          </Button>
        )}
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          {items.map((item, idx) => (
            <div key={item.id} className={cn("flex items-center gap-3 p-3 group", idx > 0 && "border-t")}>
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center shrink-0 text-xs font-bold text-accent-foreground">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-[1fr_80px_100px] gap-2 items-center">
                <p className="text-sm font-medium truncate">{item.descricao}</p>
                <Input
                  type="number"
                  value={item.quantidade}
                  onChange={e => updateItem(item.id, 'quantidade', Number(e.target.value) || 1)}
                  className="h-8 text-xs text-center"
                  min={1}
                />
                <Input
                  type="number"
                  value={item.valor_unitario}
                  onChange={e => updateItem(item.id, 'valor_unitario', Number(e.target.value) || 0)}
                  className="h-8 text-xs text-right"
                  step="0.01"
                />
              </div>
              <div className="text-right shrink-0 w-24">
                <p className="text-sm font-semibold">
                  {(item.quantidade * item.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all" onClick={() => removeItem(item.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="border-t bg-muted/40 p-3 flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-medium">TOTAL DOS ITENS</span>
            <span className="text-sm font-bold">{totalItens.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !showAdd && (
        <button type="button" onClick={() => setShowAdd(true)} className="w-full border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/40 hover:bg-accent/20 transition-all group">
          <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2 group-hover:text-primary/60 transition-colors" />
          <p className="text-sm text-muted-foreground font-medium">Nenhum item adicionado</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Clique para adicionar o primeiro item</p>
        </button>
      )}

      {/* Add item panel */}
      {showAdd && (
        <div className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
          {/* Quick add from products */}
          {(produtos?.length || 0) > 0 && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Adicionar do Catálogo</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar produto..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                {(prodSearch || filteredProds.length > 0) && (
                  <ScrollArea className="max-h-28">
                    <div className="flex flex-wrap gap-1.5">
                      {filteredProds.map(p => (
                        <button key={p.id} type="button" onClick={() => addFromProduct(p)} className="inline-flex items-center gap-1.5 text-xs bg-accent/60 hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 rounded-lg px-2.5 py-1.5 transition-all">
                          <ShoppingBag className="h-3 w-3" />
                          <span className="font-medium">{p.nome}</span>
                          <span className="text-muted-foreground">
                            {(p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase">ou manual</span>
                <Separator className="flex-1" />
              </div>
            </>
          )}

          {/* Manual add */}
          <div className="grid grid-cols-[1fr_70px_100px] gap-2">
            <Input placeholder="Descrição do item *" value={newItem.descricao} onChange={e => setNewItem(p => ({ ...p, descricao: e.target.value }))} className="text-sm" />
            <Input type="number" placeholder="Qtd" value={newItem.quantidade || ''} onChange={e => setNewItem(p => ({ ...p, quantidade: Number(e.target.value) || 1 }))} className="text-sm text-center" min={1} />
            <Input type="number" placeholder="Valor" value={newItem.valor_unitario || ''} onChange={e => setNewItem(p => ({ ...p, valor_unitario: Number(e.target.value) || 0 }))} className="text-sm text-right" step="0.01" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="NCM" value={newItem.ncm} onChange={e => setNewItem(p => ({ ...p, ncm: e.target.value }))} className="text-xs" />
            <Input placeholder="CFOP" value={newItem.cfop} onChange={e => setNewItem(p => ({ ...p, cfop: e.target.value }))} className="text-xs" />
            <Input placeholder="Unidade" value={newItem.unidade} onChange={e => setNewItem(p => ({ ...p, unidade: e.target.value }))} className="text-xs" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => { setShowAdd(false); setProdSearch(''); }}>
              Cancelar
            </Button>
            <Button type="button" size="sm" className="flex-1 gap-1.5" onClick={() => addItem()}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step Indicator ───
function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {steps.map((label, idx) => (
        <div key={label} className="flex items-center gap-1 flex-1">
          <div className={cn(
            "h-7 flex items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all",
            idx === current ? "bg-primary text-primary-foreground" : idx < current ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <span className="font-bold">{idx + 1}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {idx < steps.length - 1 && <div className={cn("flex-1 h-0.5 rounded-full", idx < current ? "bg-primary/40" : "bg-border")} />}
        </div>
      ))}
    </div>
  );
}

// ─── Main Dialog ───
export function NovoDocumentoDialog({ open, onOpenChange }: NovoDocumentoDialogProps) {
  const [step, setStep] = useState(0);
  const [direcao, setDirecao] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [items, setItems] = useState<ItemNF[]>([]);
  const [isEmitting, setIsEmitting] = useState(false);
  const { createDocumento } = useDocumentoFiscalMutations();
  const { clientes } = useClientes();
  const { data: entities } = useEntities();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: 'NFCE',
      direcao: 'SAIDA',
      natureza_operacao: 'Venda de mercadoria',
      valor_desconto: 0,
      valor_frete: 0,
      serie: '1',
    },
  });

  const tipoAtual = form.watch('tipo');
  const totalItens = items.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);
  const totalNota = totalItens + (form.watch('valor_frete') || 0) - (form.watch('valor_desconto') || 0);

  const steps = direcao === 'SAIDA'
    ? ['Tipo', 'Cliente', 'Itens', 'Finalizar']
    : ['Tipo', 'Fornecedor', 'Itens', 'Finalizar'];

  const resetAndClose = () => {
    form.reset();
    setItems([]);
    setStep(0);
    setDirecao('SAIDA');
    onOpenChange(false);
  };

  const saveItems = async (docId: string) => {
    if (items.length > 0) {
      const insertItems = items.map((item, idx) => ({
        documento_id: docId,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: parseFloat((item.quantidade * item.valor_unitario).toFixed(2)),
        unidade: item.unidade,
        ncm: item.ncm,
        cfop: item.cfop,
        codigo: item.codigo || String(idx + 1),
        produto_id: item.produto_id || null,
      }));
      await supabase.from('documento_fiscal_itens').insert(insertItems);
    }
  };

  const onSaveRascunho = async (data: FormData) => {
    const payload = {
      ...data,
      valor_produtos: totalItens,
      valor_servicos: 0,
      valor_total: totalNota,
      valor_outras: 0,
      status: 'RASCUNHO' as const,
    };

    try {
      const { data: doc, error } = await supabase
        .from('documentos_fiscais')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      await saveItems(doc.id);
      toast({ title: '📄 Rascunho salvo!' });
      resetAndClose();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    }
  };

  const onSaveAndEmit = async (data: FormData) => {
    if (items.length === 0) {
      toast({ title: 'Adicione ao menos um item', variant: 'destructive' });
      setStep(2);
      return;
    }

    setIsEmitting(true);
    try {
      const payload = {
        ...data,
        valor_produtos: totalItens,
        valor_servicos: 0,
        valor_total: totalNota,
        valor_outras: 0,
        status: 'RASCUNHO' as const,
      };

      const { data: doc, error: docErr } = await supabase
        .from('documentos_fiscais')
        .insert(payload as any)
        .select()
        .single();
      if (docErr) throw docErr;

      await saveItems(doc.id);

      const action = data.tipo === 'NFCE' ? 'emitir_nfce' : 'emitir_nfe';
      const { data: focusData, error: focusErr } = await supabase.functions.invoke('focus-nfe', {
        body: { action, documento_id: doc.id, ambiente: 'PRODUCAO' },
      });

      if (focusErr) throw new Error(focusErr.message);
      if (focusData && !focusData.success) throw new Error(focusData.error);

      toast({
        title: `🧾 ${data.tipo === 'NFCE' ? 'NFC-e' : 'NF-e'} emitida com sucesso!`,
        description: focusData?.chave_nfe ? `Chave: ${focusData.chave_nfe.substring(0, 25)}...` : undefined,
      });

      if (focusData?.danfe_url) {
        window.open(focusData.danfe_url, '_blank');
      }

      resetAndClose();
    } catch (err: any) {
      console.error('Erro ao emitir:', err);
      toast({ title: 'Erro ao emitir', description: err.message, variant: 'destructive' });
    } finally {
      setIsEmitting(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return !!form.watch('tipo');
    if (step === 1) {
      if (direcao === 'SAIDA') return true; // cliente optional for NFCE
      return true;
    }
    if (step === 2) return items.length > 0;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            Novo Documento Fiscal
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4">
          <StepIndicator current={step} steps={steps} />
        </div>

        <Form {...form}>
          <form className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-6">
              <div className="pb-4 min-h-[280px]">
                {/* ──── Step 0: Tipo & Direção ──── */}
                {step === 0 && (
                  <div className="space-y-5">
                    {/* Direção */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Direção</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['SAIDA', 'ENTRADA'] as const).map(dir => (
                          <button key={dir} type="button" onClick={() => {
                            setDirecao(dir);
                            form.setValue('direcao', dir);
                            form.setValue('natureza_operacao', dir === 'SAIDA' ? 'Venda de mercadoria' : 'Compra para comercialização');
                          }} className={cn(
                            "p-3 rounded-xl border-2 text-left transition-all",
                            direcao === dir ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                          )}>
                            <p className="text-sm font-semibold">{dir === 'SAIDA' ? '📤 Nota de Saída' : '📥 Nota de Entrada'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{dir === 'SAIDA' ? 'Vendas para clientes' : 'Compras de fornecedores'}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tipo */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Tipo de Documento</p>
                      <div className="grid grid-cols-2 gap-2">
                        {tipoOptions.map(opt => {
                          const Icon = opt.icon;
                          return (
                            <button key={opt.value} type="button" onClick={() => form.setValue('tipo', opt.value as any)} className={cn(
                              "p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                              tipoAtual === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                            )}>
                              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tipoAtual === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{opt.label}</p>
                                <p className="text-xs text-muted-foreground">{opt.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Entity */}
                    {(entities?.length || 0) > 0 && (
                      <FormField control={form.control} name="entity_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entidade</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione a entidade..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {entities?.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    )}
                  </div>
                )}

                {/* ──── Step 1: Destinatário ──── */}
                {step === 1 && (
                  <div className="space-y-4">
                    {direcao === 'SAIDA' ? (
                      <>
                        <FormField control={form.control} name="cliente_id" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5">
                              <User className="h-4 w-4" /> Cliente (Destinatário)
                              {tipoAtual === 'NFE' && <Badge variant="outline" className="text-[10px] ml-1">Obrigatório para NF-e</Badge>}
                            </FormLabel>
                            <FormControl>
                              <ClientePicker value={field.value} onChange={field.onChange} clientes={clientes || []} />
                            </FormControl>
                          </FormItem>
                        )} />
                        {tipoAtual === 'NFCE' && !form.watch('cliente_id') && (
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                            💡 Para NFC-e, o cliente é opcional. A nota será emitida para consumidor final sem identificação.
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="space-y-4">
                        <FormField control={form.control} name="razao_social" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Razão Social (Emitente/Fornecedor)</FormLabel>
                            <FormControl><Input placeholder="Nome do fornecedor" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="cnpj_cpf" render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNPJ/CPF</FormLabel>
                            <FormControl><Input placeholder="00.000.000/0001-00" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    )}

                    <FormField control={form.control} name="natureza_operacao" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Natureza da Operação</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                {/* ──── Step 2: Itens ──── */}
                {step === 2 && (
                  <ItemManager items={items} onChange={setItems} />
                )}

                {/* ──── Step 3: Finalizar ──── */}
                {step === 3 && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="rounded-xl border bg-card p-4 space-y-3">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-primary" /> Resumo do Documento
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div><span className="text-muted-foreground">Tipo:</span></div>
                        <div className="font-medium">{tipoOptions.find(t => t.value === tipoAtual)?.label}</div>
                        <div><span className="text-muted-foreground">Direção:</span></div>
                        <div className="font-medium">{direcao === 'SAIDA' ? 'Saída' : 'Entrada'}</div>
                        <div><span className="text-muted-foreground">Itens:</span></div>
                        <div className="font-medium">{items.length} {items.length === 1 ? 'item' : 'itens'}</div>
                        <div><span className="text-muted-foreground">Total Itens:</span></div>
                        <div className="font-semibold">{totalItens.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                      </div>
                    </div>

                    {/* Extra values */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="valor_frete" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frete (R$)</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="valor_desconto" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desconto (R$)</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>

                    {/* Total */}
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex justify-between items-center">
                      <span className="text-sm font-semibold">TOTAL DA NOTA</span>
                      <span className="text-xl font-bold text-primary">
                        {totalNota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    {/* Optional fields */}
                    <details className="group">
                      <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                        Dados adicionais (NF já emitida, informações extras)
                      </summary>
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <FormField control={form.control} name="numero" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Número</FormLabel>
                              <FormControl><Input placeholder="001234" className="text-sm" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="serie" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Série</FormLabel>
                              <FormControl><Input placeholder="1" className="text-sm" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="chave_acesso" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Chave de Acesso</FormLabel>
                              <FormControl><Input placeholder="44 dígitos" className="text-sm" {...field} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="informacoes_adicionais" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Informações Adicionais</FormLabel>
                            <FormControl><Textarea placeholder="Observações..." className="text-sm min-h-[60px]" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>

            {/* ──── Footer ──── */}
            <div className="border-t px-6 py-4 flex items-center gap-2 bg-card">
              {step > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
              )}
              <div className="flex-1" />
              {step < 3 ? (
                <Button type="button" size="sm" onClick={() => setStep(s => s + 1)} disabled={!canAdvance()} className="gap-1.5">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={form.handleSubmit(onSaveRascunho)} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Salvar Rascunho
                  </Button>
                  {direcao === 'SAIDA' && (tipoAtual === 'NFE' || tipoAtual === 'NFCE') && (
                    <Button type="button" size="sm" disabled={isEmitting} onClick={form.handleSubmit(onSaveAndEmit)} className="gap-1.5">
                      {isEmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {isEmitting ? 'Emitindo...' : `Emitir ${tipoAtual === 'NFCE' ? 'NFC-e' : 'NF-e'}`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
