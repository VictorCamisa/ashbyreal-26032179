import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

interface ImportarTransacoesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  tipo: string;
  data: string;
  valor: number;
  descricao: string;
  categoria: string;
  conta: string;
  subcategoria: string;
  dataCompetencia: string;
  dataCriacao: string;
}

export function ImportarTransacoesDialog({ open, onOpenChange }: ImportarTransacoesDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [entityId, setEntityId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);

  // Fetch entities
  const { data: entities } = useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch subcategories
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch accounts
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Skip header
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      // Handle CSV with possible quotes
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      
      // Parse valor (handle Brazilian format: 1.390,00)
      let valorStr = cols[2] || '0';
      valorStr = valorStr.replace(/\./g, '').replace(',', '.');
      const valor = parseFloat(valorStr) || 0;

      return {
        tipo: cols[0] || '',
        data: cols[1] || '',
        valor,
        descricao: cols[3] || '',
        categoria: cols[4] || '',
        conta: cols[5] || '',
        subcategoria: cols[6] || '',
        dataCompetencia: cols[7] || '',
        dataCriacao: cols[8] || ''
      };
    });
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Handle DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (!entityId || parsedData.length === 0) {
      toast.error('Selecione a entidade e um arquivo válido');
      return;
    }

    setImporting(true);
    setProgress(0);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      
      try {
        // Find category by name
        const category = categories?.find(c => 
          c.name.toLowerCase() === row.categoria.toLowerCase()
        );

        // Find subcategory by name
        const subcategory = subcategories?.find(s => 
          s.name.toLowerCase() === row.subcategoria.toLowerCase()
        );

        // Find account by name
        const account = accounts?.find(a => 
          a.name.toLowerCase().includes(row.conta.toLowerCase()) ||
          row.conta.toLowerCase().includes(a.name.toLowerCase())
        );

        const transaction = {
          entity_id: entityId,
          tipo: row.tipo.toLowerCase() === 'receita' ? 'RECEBER' as const : 'PAGAR' as const,
          amount: parseFloat(String(row.valor).replace(',', '.')) || 0,
          due_date: parseDate(row.data),
          description: row.descricao,
          category_id: category?.id || null,
          subcategory_id: subcategory?.id || null,
          account_id: account?.id || null,
          reference_month: row.dataCompetencia ? parseDate(row.dataCompetencia) : parseDate(row.data),
          status: 'PREVISTO' as const,
          origin: 'MANUAL' as const
        };

        const { error } = await supabase
          .from('transactions')
          .insert([transaction]);

        if (error) {
          console.error('Error inserting transaction:', error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error('Error processing row:', err);
        errorCount++;
      }

      setProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    setImporting(false);
    setImportResult({ success: successCount, errors: errorCount });
    
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['diario-caixa'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] });
      toast.success(`${successCount} transações importadas com sucesso!`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} transações falharam ao importar`);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setParsedData([]);
    setProgress(0);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Transações
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com suas transações
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Entity Selection */}
          <div className="space-y-2">
            <Label>Entidade *</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione Loja ou Particular" />
              </SelectTrigger>
              <SelectContent>
                {entities?.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name} ({entity.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Arquivo CSV *</Label>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {selectedFile 
                  ? selectedFile.name 
                  : 'Clique para selecionar ou arraste um arquivo CSV'}
              </p>
            </div>
          </div>

          {/* File Preview */}
          {parsedData.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">Arquivo carregado:</p>
              <p className="text-muted-foreground">
                {parsedData.length} transações encontradas
              </p>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Importando... {progress}%
              </p>
            </div>
          )}

          {/* Result */}
          {importResult && (
            <div className="space-y-2">
              {importResult.success > 0 && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-500/10 p-3 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{importResult.success} transações importadas</span>
                </div>
              )}
              {importResult.errors > 0 && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span>{importResult.errors} falhas</span>
                </div>
              )}
            </div>
          )}

          {/* CSV Format Info */}
          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Formato esperado do CSV:</p>
            <p>Tipo, Data, Valor, Descrição, Categoria, Conta, Subcategoria, Data Competência, Data de criação</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            {importResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {!importResult && (
            <Button 
              onClick={handleImport} 
              disabled={!entityId || parsedData.length === 0 || importing}
            >
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
