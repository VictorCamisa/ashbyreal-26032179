import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { 
  ArrowLeft, 
  MoreVertical, 
  Edit, 
  Trash2, 
  MessageCircle,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import type { Cliente } from '@/types/cliente';

interface ClienteHeaderProps {
  cliente: Cliente;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  isDeleting?: boolean;
}

export function ClienteHeader({ cliente, onEdit, onDelete, isDeleting }: ClienteHeaderProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    await onDelete();
    navigate('/clientes');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ativo':
        return { label: 'Ativo', icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
      case 'inativo':
        return { label: 'Inativo', icon: XCircle, className: 'bg-muted text-muted-foreground border-border' };
      case 'lead':
        return { label: 'Lead', icon: Clock, className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      default:
        return { label: status, icon: Clock, className: 'bg-muted text-muted-foreground border-border' };
    }
  };

  const statusConfig = getStatusConfig(cliente.status);
  const StatusIcon = statusConfig.icon;

  const handleWhatsApp = () => {
    const phone = cliente.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}`, '_blank');
  };

  const handleEmail = () => {
    window.open(`mailto:${cliente.email}`, '_blank');
  };

  const handlePhone = () => {
    window.open(`tel:${cliente.telefone}`, '_blank');
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={cliente.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {cliente.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{cliente.nome}</h1>
                <div className="flex gap-2">
                  <Badge variant="outline" className={statusConfig.className}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                  <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    {cliente.origem}
                  </Badge>
                </div>
              </div>

              {cliente.empresa && (
                <p className="text-muted-foreground">{cliente.empresa}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  {cliente.telefone}
                </span>
                {cliente.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {cliente.email}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handlePhone} className="gap-2">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Ligar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleEmail} className="gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">E-mail</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Cliente
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Cliente
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente "{cliente.nome}" será excluído permanentemente, incluindo todas as interações e dados relacionados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
