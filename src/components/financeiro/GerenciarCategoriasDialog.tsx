import { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GerenciarCategoriasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Category {
  id: string;
  name: string;
  type: 'DESPESA' | 'RECEITA';
  category_group: string | null;
  color: string | null;
  description: string | null;
  is_active: boolean;
}

type CategoryGroup = 'FIXO' | 'VARIAVEL' | 'INVESTIMENTO';

const CATEGORY_GROUPS: { value: CategoryGroup; label: string; color: string }[] = [
  { value: 'FIXO', label: 'Fixo', color: 'bg-blue-500' },
  { value: 'VARIAVEL', label: 'Variável', color: 'bg-purple-500' },
  { value: 'INVESTIMENTO', label: 'Investimento', color: 'bg-emerald-500' },
];

const getGroupColor = (group: string | null) => {
  const found = CATEGORY_GROUPS.find(g => g.value === group);
  return found?.color || 'bg-muted';
};

const getGroupLabel = (group: string | null) => {
  const found = CATEGORY_GROUPS.find(g => g.value === group);
  return found?.label || group || '-';
};

export function GerenciarCategoriasDialog({ open, onOpenChange }: GerenciarCategoriasDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'DESPESA' | 'RECEITA'>('DESPESA');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formGroup, setFormGroup] = useState<CategoryGroup>('VARIAVEL');
  const [formDescription, setFormDescription] = useState('');

  // Fetch all categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['all-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
    enabled: open,
  });

  // Filter categories by type
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(c => c.type === activeTab);
  }, [categories, activeTab]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newCategory: { name: string; type: 'DESPESA' | 'RECEITA'; category_group: CategoryGroup; description: string | null; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('categories')
        .insert([newCategory])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada com sucesso!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, category_group, description }: { id: string; name: string; category_group: CategoryGroup; description: string | null }) => {
      const { data, error } = await supabase
        .from('categories')
        .update({ name, category_group, description })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada com sucesso!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar categoria: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria excluída com sucesso!');
      setDeletingCategory(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir categoria: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormGroup('VARIAVEL');
    setFormDescription('');
    setEditingCategory(null);
    setIsCreating(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormGroup((category.category_group as CategoryGroup) || 'VARIAVEL');
    setFormDescription(category.description || '');
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingCategory(null);
    setFormName('');
    setFormGroup('VARIAVEL');
    setFormDescription('');
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        name: formName.trim(),
        category_group: formGroup,
        description: formDescription.trim() || null,
      });
    } else if (isCreating) {
      createMutation.mutate({
        name: formName.trim(),
        type: activeTab,
        category_group: formGroup,
        description: formDescription.trim() || null,
        is_active: true,
      });
    }
  };

  const isFormValid = formName.trim().length > 0;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Gerenciar Categorias
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'DESPESA' | 'RECEITA'); resetForm(); }}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="DESPESA">Despesas</TabsTrigger>
                <TabsTrigger value="RECEITA">Receitas</TabsTrigger>
              </TabsList>
              <Button size="sm" onClick={handleCreate} disabled={isCreating || !!editingCategory}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Categoria
              </Button>
            </div>

            {/* Form for create/edit */}
            {(isCreating || editingCategory) && (
              <div className="border rounded-lg p-4 mb-4 bg-muted/30">
                <h4 className="font-medium mb-3">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Nome da categoria"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Grupo</Label>
                    <Select value={formGroup} onValueChange={(v) => setFormGroup(v as CategoryGroup)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_GROUPS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn('w-3 h-3 rounded-full', g.color)} />
                              {g.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Descrição opcional"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={!isFormValid || isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {editingCategory ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </div>
            )}

            <TabsContent value="DESPESA" className="flex-1 overflow-auto">
              <CategoryTable
                categories={filteredCategories}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={setDeletingCategory}
              />
            </TabsContent>

            <TabsContent value="RECEITA" className="flex-1 overflow-auto">
              <CategoryTable
                categories={filteredCategories}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={setDeletingCategory}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{deletingCategory?.name}"?
              Esta ação não pode ser desfeita. Transações que usam esta categoria podem ficar sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface CategoryTableProps {
  categories: Category[];
  isLoading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function CategoryTable({ categories, isLoading, onEdit, onDelete }: CategoryTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma categoria cadastrada
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Grupo</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead className="w-[100px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', getGroupColor(category.category_group))} />
                {getGroupLabel(category.category_group)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {category.description || '-'}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(category)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(category)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
