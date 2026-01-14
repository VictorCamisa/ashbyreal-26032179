import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Shield, Trash2, Crown, Loader2, Phone, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminUsers, useCurrentUserRole, AdminUser } from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';

export default function GestaoUsuarios() {
  const { user } = useAuth();
  const { data: currentRoles, isLoading: rolesLoading } = useCurrentUserRole();
  const { users, isLoading, error, createUser, deleteUser, updateRole, updateProfile, bootstrapAdmin } = useAdminUsers();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', nome: '', telefone: '', cargo: '', role: 'user', is_owner: false });

  const isAdmin = currentRoles?.includes('admin');
  const hasAnyAdmin = users?.some(u => u.roles.includes('admin'));

  const handleCreateUser = async () => {
    await createUser.mutateAsync(newUser);
    setNewUser({ email: '', password: '', nome: '', telefone: '', cargo: '', role: 'user', is_owner: false });
    setDialogOpen(false);
  };

  const handleEditUser = (u: AdminUser) => {
    setEditingUser({ ...u });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    await updateProfile.mutateAsync({
      userId: editingUser.id,
      nome: editingUser.nome,
      telefone: editingUser.telefone,
      cargo: editingUser.cargo,
      is_owner: editingUser.is_owner
    });
    setEditDialogOpen(false);
    setEditingUser(null);
  };

  const handleBootstrap = async () => {
    await bootstrapAdmin.mutateAsync();
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestão de Usuários
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={newUser.nome}
                  onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Senha inicial"
                />
              </div>
              <div>
                <Label htmlFor="telefone">WhatsApp *</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={newUser.telefone}
                  onChange={(e) => setNewUser({ ...newUser, telefone: e.target.value })}
                  placeholder="(12) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={newUser.cargo}
                  onChange={(e) => setNewUser({ ...newUser, cargo: e.target.value })}
                  placeholder="Ex: Gerente, Vendedor"
                />
              </div>
              <div>
                <Label htmlFor="role">Permissão</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="moderator">Moderador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_owner"
                  checked={newUser.is_owner}
                  onCheckedChange={(checked) => setNewUser({ ...newUser, is_owner: checked === true })}
                />
                <Label htmlFor="is_owner" className="flex items-center gap-2 cursor-pointer">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Marcar como Dono
                </Label>
              </div>
              <Button 
                onClick={handleCreateUser} 
                disabled={createUser.isPending || !newUser.email || !newUser.password || !newUser.telefone}
                className="w-full"
              >
                {createUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Usuário
              </Button>
            </div>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {u.nome}
                      {u.is_owner && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                          <Crown className="h-3 w-3 mr-1" />
                          Dono
                        </Badge>
                      )}
                      {u.id === user?.id && <Badge variant="outline" className="ml-1">Você</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    {u.telefone ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {u.telefone}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{u.cargo || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length === 0 && <Badge variant="secondary">user</Badge>}
                      {u.roles.map((role) => (
                        <Badge 
                          key={role} 
                          variant={role === 'admin' ? 'default' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => {
                            if (u.id !== user?.id || role !== 'admin') {
                              updateRole.mutate({ userId: u.id, role, remove: true });
                            }
                          }}
                        >
                          {role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                          {role}
                        </Badge>
                      ))}
                      {!u.roles.includes('admin') && (
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => updateRole.mutate({ userId: u.id, role: 'admin' })}
                        >
                          + admin
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEditUser(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {u.id !== user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O usuário {u.nome} ({u.email}) será permanentemente removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser.mutate(u.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-nome">Nome</Label>
                  <Input
                    id="edit-nome"
                    value={editingUser.nome || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-telefone">WhatsApp</Label>
                  <Input
                    id="edit-telefone"
                    type="tel"
                    value={editingUser.telefone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, telefone: e.target.value })}
                    placeholder="(12) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-cargo">Cargo</Label>
                  <Input
                    id="edit-cargo"
                    value={editingUser.cargo || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, cargo: e.target.value })}
                    placeholder="Ex: Gerente, Vendedor"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-is_owner"
                    checked={editingUser.is_owner || false}
                    onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_owner: checked === true })}
                  />
                  <Label htmlFor="edit-is_owner" className="flex items-center gap-2 cursor-pointer">
                    <Crown className="h-4 w-4 text-amber-500" />
                    Marcar como Dono
                  </Label>
                </div>
                <Button 
                  onClick={handleSaveEdit} 
                  disabled={updateProfile.isPending}
                  className="w-full"
                >
                  {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}