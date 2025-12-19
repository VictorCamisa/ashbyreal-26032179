import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, FileText, CheckCircle2, XCircle, Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCartoes } from '@/hooks/useCartoes';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportarFaturaCartaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  installment_number?: number;
  total_installments?: number;
  category_suggestion?: string;
  selected?: boolean;
}

const CARD_PROVIDERS: Record<string, { label: string; formats: string[] }> = {
  'LATAM': { label: 'LATAM Pass', formats: ['CSV', 'PDF'] },
  'LATAM_BLACK': { label: 'LATAM Black', formats: ['CSV', 'PDF'] },
  'AZUL': { label: 'Azul Itaucard', formats: ['CSV', 'PDF'] },
  'ITAU_EMPRESAS': { label: 'Itaú Empresas', formats: ['XLSX', 'XLS', 'PDF'] },
  'MERCADO_LIVRE': { label: 'Mercado Livre', formats: ['PDF', 'CSV'] },
  'SANTANDER_SMILES': { label: 'Santander Smiles', formats: ['PDF', 'CSV'] },
  'GENERICO': { label: 'Genérico', formats: ['CSV', 'XLSX', 'PDF'] },
};

export function ImportarFaturaCartaoDialog({ 
  open, 
  onOpenChange,
  onSuccess 
}: ImportarFaturaCartaoDialogProps) {
  const { cartoes } = useCartoes();
  const { createGasto, isCreating } = useGastosCartaoMutations();
  
  const [step, setStep] = useState<'select' | 'upload' | 'preview' | 'importing' | 'done'>('select');
  const [selectedCartao, setSelectedCartao] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });

  // Obter o cartão selecionado e seu provider
  const selectedCartaoData = cartoes?.find(c => c.id === selectedCartao);
  const cardProvider = selectedCartaoData?.card_provider || 'GENERICO';
  const providerInfo = CARD_PROVIDERS[cardProvider] || CARD_PROVIDERS['GENERICO'];

  const resetDialog = () => {
    setStep('select');
    setSelectedCartao('');
    setSelectedFile(null);
    setParsedTransactions([]);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const parseCSVFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const readFileAsBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          resolve(arrayBufferToBase64(buffer));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setStep('upload');

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      let content = '';
      let fileBase64 = '';

      if (fileExt === 'csv') {
        content = await parseCSVFile(file);
      } else if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'pdf') {
        // Enviar o arquivo íntegro (base64) para a Edge Function processar
        fileBase64 = await readFileAsBase64(file);
      }

      // Call edge function to parse usando o provider do cartão
      const { data: result, error } = await supabase.functions.invoke('import-card-statement', {
        body: {
          creditCardId: selectedCartao,
          cardProvider: cardProvider,
          fileType: fileExt?.toUpperCase(),
          fileName: file.name,
          content,
          fileBase64,
        }
      });

      if (error) throw error;

      // Verificar se há erro retornado (ex: PDF não suportado)
      if (result.error) {
        toast.error(result.error);
        setStep('select');
        return;
      }

      if (result.transactions && result.transactions.length > 0) {
        setParsedTransactions(result.transactions.map((t: ParsedTransaction) => ({ ...t, selected: true })));
        setStep('preview');
        toast.success(`${result.transactions.length} transações encontradas`);
      } else {
        toast.warning('Nenhuma transação encontrada no arquivo. Verifique se o formato está correto.');
        setStep('select');
      }
    } catch (err: any) {
      console.error('Erro ao processar arquivo:', err);
      toast.error('Erro ao processar arquivo: ' + (err.message || 'Erro desconhecido'));
      setStep('select');
    }
  }, [selectedCartao, cardProvider]);

  const toggleTransaction = (index: number) => {
    setParsedTransactions(prev => 
      prev.map((t, i) => i === index ? { ...t, selected: !t.selected } : t)
    );
  };

  const toggleAll = () => {
    const allSelected = parsedTransactions.every(t => t.selected);
    setParsedTransactions(prev => prev.map(t => ({ ...t, selected: !allSelected })));
  };

  const handleImport = async () => {
    const toImport = parsedTransactions.filter(t => t.selected);
    if (toImport.length === 0) {
      toast.error('Selecione ao menos uma transação');
      return;
    }

    setStep('importing');
    let success = 0;
    let failed = 0;

    for (let i = 0; i < toImport.length; i++) {
      const t = toImport[i];
      try {
        await createGasto({
          credit_card_id: selectedCartao,
          description: t.description,
          amount: t.amount,
          purchase_date: t.date,
          installment_number: t.installment_number || 1,
          total_installments: t.total_installments || 1,
          // Ao importar parcela 02/10, criar 03/10 até 10/10 automaticamente
          create_remaining_installments: (t.total_installments || 1) > 1,
        });
        success++;
      } catch (err) {
        console.error('Erro ao importar transação:', err);
        failed++;
      }
      setImportProgress(Math.round(((i + 1) / toImport.length) * 100));
    }

    setImportResults({ success, failed });
    setStep('done');
    
    if (success > 0) {
      toast.success(`${success} transações importadas com sucesso`);
      onSuccess?.();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const selectedTransactionsTotal = parsedTransactions
    .filter(t => t.selected)
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Importar Fatura de Cartão
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Selecione o Cartão</Label>
              <Select value={selectedCartao} onValueChange={setSelectedCartao}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um cartão..." />
                </SelectTrigger>
                <SelectContent>
                  {cartoes?.map((cartao) => (
                    <SelectItem key={cartao.id} value={cartao.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{cartao.name}</span>
                        {cartao.card_provider && (
                          <Badge variant="outline" className="text-xs">
                            {CARD_PROVIDERS[cartao.card_provider]?.label || cartao.card_provider}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCartao && (
              <>
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>Formato detectado:</strong> {providerInfo.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Arquivos aceitos: {providerInfo.formats.join(', ')}
                  </p>
                </div>

                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Arraste o arquivo ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Formatos aceitos: {providerInfo.formats.join(', ')}
                    </p>
                  </label>
                </div>
              </>
            )}

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Instruções
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cada cartão deve ter um <strong>Provedor</strong> configurado (LATAM, Azul, Itaú Empresas, etc.)</li>
                <li>• Exporte a fatura do site do seu banco no formato correto</li>
                <li>• O sistema detectará automaticamente as transações</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Processando arquivo...</p>
            <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {parsedTransactions.filter(t => t.selected).length} / {parsedTransactions.length} selecionadas
                </Badge>
                <span className="font-semibold text-lg">
                  Total: {formatCurrency(selectedTransactionsTotal)}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {parsedTransactions.every(t => t.selected) ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTransactions.map((t, index) => (
                    <TableRow 
                      key={index} 
                      className={`cursor-pointer ${!t.selected ? 'opacity-50' : ''}`}
                      onClick={() => toggleTransaction(index)}
                    >
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={t.selected} 
                          onChange={() => {}}
                          className="h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                      <TableCell>
                        {t.total_installments && t.total_installments > 1 
                          ? `${t.installment_number}/${t.total_installments}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('select')}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={parsedTransactions.filter(t => t.selected).length === 0}>
                Importar {parsedTransactions.filter(t => t.selected).length} Transações
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Importando transações...</p>
            <Progress value={importProgress} className="w-64" />
            <p className="text-sm text-muted-foreground">{importProgress}%</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-xl font-semibold">Importação Concluída!</p>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-green-600">{importResults.success}</p>
                <p className="text-sm text-muted-foreground">Importadas</p>
              </div>
              {importResults.failed > 0 && (
                <div>
                  <p className="text-3xl font-bold text-red-600">{importResults.failed}</p>
                  <p className="text-sm text-muted-foreground">Falhas</p>
                </div>
              )}
            </div>
            <Button onClick={handleClose} className="mt-4">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
