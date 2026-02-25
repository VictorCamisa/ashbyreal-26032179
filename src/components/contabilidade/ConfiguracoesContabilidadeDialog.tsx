import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, Bell, FileText, Key } from 'lucide-react';

interface ConfiguracoesContabilidadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfiguracoesContabilidadeDialog({
  open,
  onOpenChange,
}: ConfiguracoesContabilidadeDialogProps) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['contabilidade-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contabilidade_config')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    regime_tributario: 'simples_nacional',
    api_provider: '',
    api_key: '',
    ambiente: 'homologacao',
    serie_nfe: '1',
    serie_nfce: '1',
    serie_nfse: '1',
    ultimo_numero_nfe: 0,
    ultimo_numero_nfce: 0,
    ultimo_numero_nfse: 0,
    alerta_entrada_sem_nf: true,
    alerta_saida_sem_nf: true,
    alerta_divergencia_valor: true,
    tolerancia_divergencia: 0.01,
    csc_id: '',
    csc_token: '',
  });

  useEffect(() => {
    if (config) {
      setFormData({
        cnpj: config.cnpj || '',
        inscricao_estadual: config.inscricao_estadual || '',
        inscricao_municipal: config.inscricao_municipal || '',
        regime_tributario: config.regime_tributario || 'simples_nacional',
        api_provider: config.api_provider || '',
        api_key: config.api_key || '',
        ambiente: config.ambiente || 'homologacao',
        serie_nfe: config.serie_nfe || '1',
        serie_nfce: config.serie_nfce || '1',
        serie_nfse: config.serie_nfse || '1',
        ultimo_numero_nfe: config.ultimo_numero_nfe || 0,
        ultimo_numero_nfce: config.ultimo_numero_nfce || 0,
        ultimo_numero_nfse: config.ultimo_numero_nfse || 0,
        alerta_entrada_sem_nf: config.alerta_entrada_sem_nf ?? true,
        alerta_saida_sem_nf: config.alerta_saida_sem_nf ?? true,
        alerta_divergencia_valor: config.alerta_divergencia_valor ?? true,
        tolerancia_divergencia: config.tolerancia_divergencia || 0.01,
        csc_id: (config as any).csc_id || '',
        csc_token: (config as any).csc_token || '',
      });
    }
  }, [config]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (config?.id) {
        const { error } = await supabase
          .from('contabilidade_config')
          .update(data)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contabilidade_config')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contabilidade-config'] });
      toast.success('Configurações salvas com sucesso!');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao salvar configurações');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de Contabilidade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="empresa" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="empresa" className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Empresa</span>
              </TabsTrigger>
              <TabsTrigger value="documentos" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Documentos</span>
              </TabsTrigger>
              <TabsTrigger value="alertas" className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Alertas</span>
              </TabsTrigger>
              <TabsTrigger value="integracao" className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">API</span>
              </TabsTrigger>
            </TabsList>

            {/* Empresa */}
            <TabsContent value="empresa" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) =>
                      setFormData({ ...formData, cnpj: e.target.value })
                    }
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regime">Regime Tributário</Label>
                  <Select
                    value={formData.regime_tributario}
                    onValueChange={(value) =>
                      setFormData({ ...formData, regime_tributario: value })
                    }
                  >
                    <SelectTrigger id="regime">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simples_nacional">
                        Simples Nacional
                      </SelectItem>
                      <SelectItem value="lucro_presumido">
                        Lucro Presumido
                      </SelectItem>
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                      <SelectItem value="mei">MEI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ie">Inscrição Estadual</Label>
                  <Input
                    id="ie"
                    value={formData.inscricao_estadual}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        inscricao_estadual: e.target.value,
                      })
                    }
                    placeholder="000.000.000.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="im">Inscrição Municipal</Label>
                  <Input
                    id="im"
                    value={formData.inscricao_municipal}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        inscricao_municipal: e.target.value,
                      })
                    }
                    placeholder="00000000"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Documentos */}
            <TabsContent value="documentos" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serie_nfe">Série NF-e</Label>
                  <Input
                    id="serie_nfe"
                    value={formData.serie_nfe}
                    onChange={(e) =>
                      setFormData({ ...formData, serie_nfe: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serie_nfce">Série NFC-e</Label>
                  <Input
                    id="serie_nfce"
                    value={formData.serie_nfce}
                    onChange={(e) =>
                      setFormData({ ...formData, serie_nfce: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serie_nfse">Série NFS-e</Label>
                  <Input
                    id="serie_nfse"
                    value={formData.serie_nfse}
                    onChange={(e) =>
                      setFormData({ ...formData, serie_nfse: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ultimo_nfe">Último Nº NF-e</Label>
                  <Input
                    id="ultimo_nfe"
                    type="number"
                    value={formData.ultimo_numero_nfe}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ultimo_numero_nfe: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ultimo_nfce">Último Nº NFC-e</Label>
                  <Input
                    id="ultimo_nfce"
                    type="number"
                    value={formData.ultimo_numero_nfce}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ultimo_numero_nfce: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ultimo_nfse">Último Nº NFS-e</Label>
                  <Input
                    id="ultimo_nfse"
                    type="number"
                    value={formData.ultimo_numero_nfse}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ultimo_numero_nfse: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* Alertas */}
            <TabsContent value="alertas" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Entrada sem NF</p>
                    <p className="text-sm text-muted-foreground">
                      Alertar quando boletos pagos não tiverem nota fiscal de
                      entrada
                    </p>
                  </div>
                  <Switch
                    checked={formData.alerta_entrada_sem_nf}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, alerta_entrada_sem_nf: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Saída sem NF</p>
                    <p className="text-sm text-muted-foreground">
                      Alertar quando pedidos entregues não tiverem nota fiscal
                      emitida
                    </p>
                  </div>
                  <Switch
                    checked={formData.alerta_saida_sem_nf}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, alerta_saida_sem_nf: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Divergência de valores</p>
                    <p className="text-sm text-muted-foreground">
                      Alertar quando houver diferença entre valor pago e valor da
                      nota
                    </p>
                  </div>
                  <Switch
                    checked={formData.alerta_divergencia_valor}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        alerta_divergencia_valor: checked,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tolerancia">
                    Tolerância para divergência (%)
                  </Label>
                  <Input
                    id="tolerancia"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={(formData.tolerancia_divergencia * 100).toFixed(2)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tolerancia_divergencia:
                          parseFloat(e.target.value) / 100 || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Diferenças abaixo desta porcentagem serão ignoradas
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Integração API */}
            <TabsContent value="integracao" className="space-y-4 mt-4">
              <div className="p-4 bg-muted/50 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">
                  Configure a integração com um provedor de emissão de NF-e para
                  emissão automática. Por enquanto, o sistema funciona em modo
                  híbrido (controle manual).
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provedor de NF-e</Label>
                  <Select
                    value={formData.api_provider || 'none'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        api_provider: value === 'none' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Selecione um provedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (modo híbrido)</SelectItem>
                      <SelectItem value="nfeio">NFe.io</SelectItem>
                      <SelectItem value="focusnfe">Focus NF-e</SelectItem>
                      <SelectItem value="webmania">Webmania</SelectItem>
                      <SelectItem value="enotas">eNotas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.api_provider && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="apikey">API Key</Label>
                      <Input
                        id="apikey"
                        type="password"
                        value={formData.api_key}
                        onChange={(e) =>
                          setFormData({ ...formData, api_key: e.target.value })
                        }
                        placeholder="Sua chave de API"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ambiente">Ambiente</Label>
                      <Select
                        value={formData.ambiente}
                        onValueChange={(value) =>
                          setFormData({ ...formData, ambiente: value })
                        }
                      >
                        <SelectTrigger id="ambiente">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="homologacao">Homologação</SelectItem>
                          <SelectItem value="producao">Produção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {formData.api_provider && (
                  <div className="mt-6 pt-4 border-t space-y-4">
                    <div>
                      <p className="font-medium text-sm">Credenciamento NFC-e (CSC)</p>
                      <p className="text-xs text-muted-foreground">
                        Código de Segurança do Contribuinte para emissão de NFC-e (obtido na SEFAZ)
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="csc_id">ID do CSC</Label>
                        <Input
                          id="csc_id"
                          value={formData.csc_id}
                          onChange={(e) =>
                            setFormData({ ...formData, csc_id: e.target.value })
                          }
                          placeholder="000001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="csc_token">Token CSC</Label>
                        <Input
                          id="csc_token"
                          type="password"
                          value={formData.csc_token}
                          onChange={(e) =>
                            setFormData({ ...formData, csc_token: e.target.value })
                          }
                          placeholder="UUID do token CSC"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚠️ O CSC deve ser configurado diretamente no{' '}
                      <a href="https://app.focusnfe.com.br" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                        painel da Focus NFe
                      </a>
                      {' '}na seção da empresa. Os valores aqui são apenas para referência.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

