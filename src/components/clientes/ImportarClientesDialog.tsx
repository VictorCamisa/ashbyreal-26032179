import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ClienteCSV {
  nome: string;
  telefone: string;
  email?: string;
  empresa?: string;
  origem?: string;
  isValid: boolean;
  error?: string;
}

interface ImportarClientesDialogProps {
  onImport: (clientes: Array<{ nome: string; telefone: string; email: string; origem: string; empresa?: string }>) => Promise<unknown>;
  isImporting?: boolean;
}

export function ImportarClientesDialog({ onImport, isImporting }: ImportarClientesDialogProps) {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ClienteCSV[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setParsedData([]);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseCSV = (text: string): ClienteCSV[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    // Parse header
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Find column indices
    const nomeIndex = headers.findIndex(h => ['nome', 'name', 'cliente'].includes(h));
    const telefoneIndex = headers.findIndex(h => ['telefone', 'phone', 'celular', 'tel', 'fone'].includes(h));
    const emailIndex = headers.findIndex(h => ['email', 'e-mail', 'mail'].includes(h));
    const empresaIndex = headers.findIndex(h => ['empresa', 'company', 'companhia'].includes(h));
    const origemIndex = headers.findIndex(h => ['origem', 'source', 'fonte'].includes(h));

    // Validate required columns
    if (nomeIndex === -1 || telefoneIndex === -1) {
      toast({
        variant: 'destructive',
        title: 'Colunas obrigatórias não encontradas',
        description: 'O CSV deve conter as colunas "nome" e "telefone".',
      });
      return [];
    }

    // Parse data rows
    const data: ClienteCSV[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
      
      const nome = values[nomeIndex] || '';
      const telefone = values[telefoneIndex] || '';
      const email = emailIndex !== -1 ? values[emailIndex] : '';
      const empresa = empresaIndex !== -1 ? values[empresaIndex] : '';
      const origem = origemIndex !== -1 ? values[origemIndex] : '';

      // Validate required fields
      let isValid = true;
      let error = '';

      if (!nome.trim()) {
        isValid = false;
        error = 'Nome obrigatório';
      } else if (!telefone.trim()) {
        isValid = false;
        error = 'Telefone obrigatório';
      }

      data.push({
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email?.trim() || undefined,
        empresa: empresa?.trim() || undefined,
        origem: origem?.trim() || undefined,
        isValid,
        error,
      });
    }

    return data;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo CSV.',
      });
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    const validClientes = parsedData
      .filter(c => c.isValid)
      .map(c => ({
        nome: c.nome,
        telefone: c.telefone,
        email: c.email || `${c.telefone.replace(/\D/g, '')}@importado.local`,
        origem: c.origem || 'importacao_csv',
        empresa: c.empresa,
      }));

    if (validClientes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum cliente válido',
        description: 'Não há clientes válidos para importar.',
      });
      return;
    }

    try {
      await onImport(validClientes);
      toast({
        title: 'Importação concluída!',
        description: `${validClientes.length} cliente(s) importado(s) com sucesso.`,
      });
      resetState();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: error.message,
      });
    }
  };

  const validCount = parsedData.filter(c => c.isValid).length;
  const invalidCount = parsedData.filter(c => !c.isValid).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Clientes via CSV</DialogTitle>
          <DialogDescription>
            O arquivo deve conter as colunas <strong>nome</strong> e <strong>telefone</strong> (obrigatórios). 
            Colunas opcionais: email, empresa, origem.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* File Upload Area */}
          {parsedData.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Clique para selecionar ou arraste um arquivo CSV
              </p>
              <p className="text-xs text-muted-foreground/70">
                Exemplo: nome;telefone;email;empresa;origem
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={resetState}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Check className="h-3 w-3 mr-1" />
                    {validCount} válidos
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {invalidCount} inválidos
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Origem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((cliente, index) => (
                      <TableRow key={index} className={!cliente.isValid ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <TableCell>
                          {cliente.isValid ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{cliente.nome || '-'}</TableCell>
                        <TableCell>{cliente.telefone || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{cliente.email || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{cliente.empresa || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{cliente.origem || 'importacao_csv'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Actions */}
        {parsedData.length > 0 && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => { resetState(); setOpen(false); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={validCount === 0 || isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar {validCount} cliente(s)
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
