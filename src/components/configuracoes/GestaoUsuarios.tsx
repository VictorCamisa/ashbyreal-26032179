import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, UserPlus, Shield, Trash2, Crown, Loader2, Phone, Pencil, Check, ShieldCheck, ShieldX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAdminUsers, useCurrentUserRole, AdminUser, ALL_MODULES } from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default function GestaoUsuarios() {
  const { user } = useAuth();
  const { data: currentRoles, isLoading: rolesLoading } = useCurrentUserRole();
  const { users, isLoading, error, createUser, deleteUser, updateRole, updateProfile, bootstrapAdmin } = useAdminUsers();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingModules, setEditingModules] = useState<string[]>([]);
  const [newUser, setNewUser] = useState({ 
    email: '', 
    password: '', 
    nome: '', 
    telefone: '', 
    cargo: '', 
    role: 'user', 
    is_owner: false,
    modules: ALL_MODULES.map(m => m.key) as string[],
    isAdmin: false
  });

  const isAdmin = currentRoles?.includes('admin');
  const hasAnyAdmin = users?.some(u => u.roles.includes('admin'));

  const handleCreateUser = async () => {
    const userData = {
      ...newUser,
      role: newUser.isAdmin ? 'admin' : 'user',
      modules: newUser.isAdmin ? ALL_MODULES.map(m => m.key) : newUser.modules
    };
    await createUser.mutateAsync(userData);
    setNewUser({ 
      email: '', 
      password: '', 
      nome: '', 
      telefone: '', 
      cargo: '', 
      role: 'user', 
      is_owner: false,
      modules: ALL_MODULES.map(m => m.key) as string[],
      isAdmin: false
    });
    setDialogOpen(false);
  };

  const handleEditUser = (u: AdminUser) => {
    setEditingUser({ ...u });
    setEditingModules(u.modules || ALL_MODULES.map(m => m.key));
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    await updateProfile.mutateAsync({
      userId: editingUser.id,
      nome: editingUser.nome,
      telefone: editingUser.telefone,
      cargo: editingUser.cargo,
      is_owner: editingUser.is_owner,
      modules: editingModules
    });
    setEditDialogOpen(false);
    setEditingUser(null);
    setEditingModules([]);
  };

  const handleToggleAdmin = async (u: AdminUser) => {
    const isCurrentlyAdmin = u.roles.includes('admin');
    await updateRole.mutateAsync({ 
      userId: u.id, 
      role: 'admin', 
      remove: isCurrentlyAdmin 
    });
  };

  const handleBootstrap = async () => {
    await bootstrapAdmin.mutateAsync();
  };

  const toggleModule = (moduleKey: string, isNew: boolean = false) => {
    if (isNew) {
      setNewUser(prev => ({
        ...prev,
        modules: prev.modules.includes(moduleKey)
          ? prev.modules.filter(m => m !== moduleKey)
          : [...prev.modules, moduleKey]
      }));
    } else {
      setEditingModules(prev => 
        prev.includes(moduleKey)
          ? prev.filter(m => m !== moduleKey)
          : [...prev, moduleKey]
      );
    }
  };

  if (rolesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show bootstrap button if no admin exists
  if (!hasAnyAdmin && !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuração Inicial</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Crown className="h-12 w-12 mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground mb-4">
            Nenhum administrador configurado. Clique abaixo para se tornar o primeiro administrador do sistema.
          </p>
          <Button onClick={handleBootstrap} disabled={bootstrapAdmin.isPending}>
            {bootstrapAdmin.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Shield className="h-4 w-4 mr-2" />
            Tornar-me Administrador
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Usuários</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Apenas administradores podem gerenciar usuários.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestão de Usuários
            </CardTitle>
            <CardDescription className="mt-1">
              Gerencie os usuários do sistema e suas permissões
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo usuário no sistema
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={newUser.nome}
                    onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">WhatsApp *</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    value={newUser.telefone}
                    onChange={(e) => setNewUser({ ...newUser, telefone: e.target.value })}
                    placeholder="(12) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={newUser.cargo}
                    onChange={(e) => setNewUser({ ...newUser, cargo: e.target.value })}
                    placeholder="Ex: Vendedor Externo"
                  />
                </div>

                <Separator />

                {/* Simple Admin Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${newUser.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Acesso Total (Admin)</p>
                      <p className="text-xs text-muted-foreground">
                        Pode gerenciar tudo no sistema
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={newUser.isAdmin}
                    onCheckedChange={(checked) => setNewUser({ ...newUser, isAdmin: checked })}
                  />
                </div>

                {!newUser.isAdmin && (
                  <div className="space-y-2">
                    <Label>Módulos com Acesso</Label>
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
                      {ALL_MODULES.map((module) => (
                        <label 
                          key={module.key}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={newUser.modules.includes(module.key)}
                            onChange={() => toggleModule(module.key, true)}
                            className="rounded"
                          />
                          {module.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreateUser} 
                  disabled={createUser.isPending || !newUser.email || !newUser.password || !newUser.telefone || !newUser.nome}
                  className="w-full"
                >
                  {createUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Usuário
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <p>Erro ao carregar usuários: {(error as Error).message}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users?.map((u) => (
                <div 
                  key={u.id} 
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {u.nome?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.nome || u.email}</span>
                        {u.is_owner && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Dono
                          </Badge>
                        )}
                        {u.id === user?.id && (
                          <Badge variant="secondary" className="text-xs">Você</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{u.email}</span>
                        {u.telefone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {u.telefone}
                            </span>
                          </>
                        )}
                        {u.cargo && (
                          <>
                            <span>•</span>
                            <span>{u.cargo}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Admin status badge */}
                    {u.roles.includes('admin') ? (
                      <Badge className="bg-primary text-primary-foreground">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <ShieldX className="h-3 w-3 mr-1" />
                        Usuário
                      </Badge>
                    )}

                    {/* Quick admin toggle */}
                    {u.id !== user?.id && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleAdmin(u)}
                        disabled={updateRole.isPending}
                        title={u.roles.includes('admin') ? 'Remover admin' : 'Tornar admin'}
                      >
                        {u.roles.includes('admin') ? (
                          <ShieldX className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                    )}

                    {/* Edit button */}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditUser(u)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {/* Delete button */}
                    {u.id !== user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O usuário <strong>{u.nome}</strong> ({u.email}) será permanentemente removido.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteUser.mutate(u.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}

              {users?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum usuário encontrado</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome Completo</Label>
                <Input
                  id="edit-nome"
                  value={editingUser.nome || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefone">WhatsApp</Label>
                <Input
                  id="edit-telefone"
                  type="tel"
                  value={editingUser.telefone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, telefone: e.target.value })}
                  placeholder="(12) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cargo">Cargo</Label>
                <Input
                  id="edit-cargo"
                  value={editingUser.cargo || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, cargo: e.target.value })}
                  placeholder="Ex: Gerente, Vendedor"
                />
              </div>

              <Separator />

              {/* Admin info or module selection */}
              {editingUser.roles.includes('admin') ? (
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-primary/5">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Este usuário é Admin</p>
                    <p className="text-xs text-muted-foreground">
                      Admins têm acesso a todos os módulos automaticamente
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Módulos com Acesso</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
                    {ALL_MODULES.map((module) => (
                      <label 
                        key={module.key}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={editingModules.includes(module.key)}
                          onChange={() => toggleModule(module.key, false)}
                          className="rounded"
                        />
                        {module.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editingModules.length} de {ALL_MODULES.length} módulos selecionados
                  </p>
                </div>
              )}

              {/* Owner toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Marcar como Dono</span>
                </div>
                <Switch
                  checked={editingUser.is_owner || false}
                  onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_owner: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              onClick={handleSaveEdit} 
              disabled={updateProfile.isPending}
              className="w-full"
            >
              {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Check className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
