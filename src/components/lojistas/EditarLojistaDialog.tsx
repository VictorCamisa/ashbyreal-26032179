import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, Loader2, Building2, FileText, MapPin } from 'lucide-react';
import { useLojistas, Lojista, LojistaInput } from '@/hooks/useLojistas';

interface EditarLojistaDialogProps {
  lojista: Lojista | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditarLojistaDialog({ lojista, open, onOpenChange, onSuccess }: EditarLojistaDialogProps) {
  const { updateLojista, isUpdating } = useLojistas();

  const [form, setForm] = useState<LojistaInput & { endereco: any }>({
    nome: '', nome_fantasia: '', razao_social: '', cnpj: '', telefone: '', telefone_secundario: '',
    email: '', contato_responsavel: '', observacoes: '',
    inscricao_estadual: '', inscricao_municipal: '', regime_tributario: 'SIMPLES_NACIONAL',
    contribuinte_icms: 'NAO_CONTRIBUINTE', suframa: '',
    endereco: { rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' },
  });

  useEffect(() => {
    if (lojista && open) {
      const end = lojista.endereco || {};
      setForm({
        nome: lojista.nome || '',
        nome_fantasia: lojista.nome_fantasia || '',
        razao_social: lojista.razao_social || '',
        cnpj: lojista.cnpj || '',
        telefone: lojista.telefone || '',
        telefone_secundario: lojista.telefone_secundario || '',
        email: lojista.email || '',
        contato_responsavel: lojista.contato_responsavel || '',
        observacoes: lojista.observacoes || '',
        inscricao_estadual: lojista.inscricao_estadual || '',
        inscricao_municipal: lojista.inscricao_municipal || '',
        regime_tributario: lojista.regime_tributario || 'SIMPLES_NACIONAL',
        contribuinte_icms: lojista.contribuinte_icms || 'NAO_CONTRIBUINTE',
        suframa: lojista.suframa || '',
        endereco: {
          rua: end.rua || '', numero: end.numero || '', complemento: end.complemento || '',
          bairro: end.bairro || '', cidade: end.cidade || '', estado: end.estado || '', cep: end.cep || '',
        },
      });
    }
  }, [lojista, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojista) return;
    try {
      await updateLojista({ id: lojista.id, ...form });
      onOpenChange(false);
      onSuccess?.();
    } catch {}
  };

  const updateEndereco = (field: string, value: string) => {
    setForm(prev => ({ ...prev, endereco: { ...prev.endereco, [field]: value } }));
  };

  const formatCNPJ = (value: string) => {
    const n = value.replace(/\D/g, '');
    return n.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
  };

  const formatPhone = (value: string) => {
    const n = value.replace(/\D/g, '');
    if (n.length <= 10) return n.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    return n.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
  };

  const formatCEP = (value: string) => {
    const n = value.replace(/\D/g, '');
    return n.replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" /> Editar Lojista
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-10">
              <TabsTrigger value="geral" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Geral</TabsTrigger>
              <TabsTrigger value="fiscal" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Fiscal</TabsTrigger>
              <TabsTrigger value="endereco" className="gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" />Endereço</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Razão Social *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div>
                  <Label>Nome Fantasia</Label>
                  <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: formatCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <Label>Telefone *</Label>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })} required />
                </div>
                <div>
                  <Label>Telefone Secundário</Label>
                  <Input value={form.telefone_secundario} onChange={(e) => setForm({ ...form, telefone_secundario: formatPhone(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Contato Responsável</Label>
                  <Input value={form.contato_responsavel} onChange={(e) => setForm({ ...form, contato_responsavel: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fiscal" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Inscrição Estadual (IE)</Label>
                  <Input value={form.inscricao_estadual} onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })} placeholder="Número da IE" />
                </div>
                <div>
                  <Label>Inscrição Municipal (IM)</Label>
                  <Input value={form.inscricao_municipal} onChange={(e) => setForm({ ...form, inscricao_municipal: e.target.value })} placeholder="Número da IM" />
                </div>
                <div>
                  <Label>Regime Tributário</Label>
                  <Select value={form.regime_tributario} onValueChange={(v) => setForm({ ...form, regime_tributario: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                      <SelectItem value="SIMPLES_NACIONAL_EXCESSO">Simples Nacional - Excesso</SelectItem>
                      <SelectItem value="LUCRO_PRESUMIDO">Lucro Presumido</SelectItem>
                      <SelectItem value="LUCRO_REAL">Lucro Real</SelectItem>
                      <SelectItem value="MEI">MEI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Contribuinte ICMS</Label>
                  <Select value={form.contribuinte_icms} onValueChange={(v) => setForm({ ...form, contribuinte_icms: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTRIBUINTE">Contribuinte</SelectItem>
                      <SelectItem value="ISENTO">Isento</SelectItem>
                      <SelectItem value="NAO_CONTRIBUINTE">Não Contribuinte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>SUFRAMA</Label>
                  <Input value={form.suframa} onChange={(e) => setForm({ ...form, suframa: e.target.value })} placeholder="Código SUFRAMA (se aplicável)" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Esses dados são utilizados na emissão de NF-e, NFC-e e relatórios fiscais.</p>
            </TabsContent>

            <TabsContent value="endereco" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CEP</Label>
                  <Input value={form.endereco?.cep || ''} onChange={(e) => updateEndereco('cep', formatCEP(e.target.value))} placeholder="00000-000" />
                </div>
                <div className="col-span-2">
                  <Label>Logradouro</Label>
                  <Input value={form.endereco?.rua || ''} onChange={(e) => updateEndereco('rua', e.target.value)} />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input value={form.endereco?.numero || ''} onChange={(e) => updateEndereco('numero', e.target.value)} />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input value={form.endereco?.complemento || ''} onChange={(e) => updateEndereco('complemento', e.target.value)} />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input value={form.endereco?.bairro || ''} onChange={(e) => updateEndereco('bairro', e.target.value)} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={form.endereco?.cidade || ''} onChange={(e) => updateEndereco('cidade', e.target.value)} />
                </div>
                <div>
                  <Label>Estado (UF)</Label>
                  <Input value={form.endereco?.estado || ''} onChange={(e) => updateEndereco('estado', e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Endereço completo é obrigatório para emissão de NF-e (Modelo 55).</p>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
