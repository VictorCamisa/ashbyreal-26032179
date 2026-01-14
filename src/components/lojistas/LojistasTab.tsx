import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Search, Store, Phone, Mail, Trash2, Eye } from 'lucide-react';
import { useLojistas } from '@/hooks/useLojistas';
import { NovoLojistaDialog } from './NovoLojistaDialog';
import { LojistaDetailsSheet } from './LojistaDetailsSheet';
import { cn } from '@/lib/utils';

export function LojistasTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLojistaId, setSelectedLojistaId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const { lojistas, isLoading, deleteLojista, refetch } = useLojistas();

  const filteredLojistas = lojistas.filter((l) => {
    const search = searchTerm.toLowerCase();
    return (
      l.nome.toLowerCase().includes(search) ||
      l.nome_fantasia?.toLowerCase().includes(search) ||
      l.cnpj?.includes(searchTerm) ||
      l.telefone.includes(searchTerm)
    );
  });

  const openDetails = (lojistaId: string) => {
    setSelectedLojistaId(lojistaId);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lojista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <NovoLojistaDialog onSuccess={refetch} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium">Lojista</TableHead>
                <TableHead className="font-medium">CNPJ</TableHead>
                <TableHead className="font-medium">Contato</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLojistas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Store className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground">Nenhum lojista encontrado</p>
                      <NovoLojistaDialog onSuccess={refetch} />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLojistas.map((lojista) => (
                  <TableRow 
                    key={lojista.id} 
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => openDetails(lojista.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{lojista.nome}</p>
                          {lojista.nome_fantasia && (
                            <p className="text-sm text-muted-foreground">{lojista.nome_fantasia}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {lojista.cnpj || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {lojista.telefone}
                        </div>
                        {lojista.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {lojista.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={cn(
                          lojista.status === 'ativo' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                        )}
                      >
                        {lojista.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openDetails(lojista.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir lojista?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Todos os dados do lojista serão removidos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteLojista(lojista.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {filteredLojistas.length} lojista(s) encontrado(s)
      </p>

      {/* Details Sheet */}
      <LojistaDetailsSheet
        lojistaId={selectedLojistaId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
