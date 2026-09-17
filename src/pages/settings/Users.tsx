import { useState, useEffect } from 'react';
import { UserCog, Plus, Mail, Ban, Check, Loader2, Building2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { usePermissions, ROLE_LABELS, ROLE_BADGE_CLASSES } from '@/hooks/usePermissions';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  createBusinessUser,
  listBusinessUsers,
  updateBusinessUserRole,
  deactivateBusinessUser,
} from '@/lib/supabase-admin';
import type { BusinessRole, BusinessUser } from '@/types/domains/user';

const ROLE_OPTIONS: { value: BusinessRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'caixa', label: 'Caixa' },
];

export default function UsersPage() {
  const { currentBusiness, businesses } = useBusiness();
  const { user: authUser } = useAuth();
  const { can, role } = usePermissions();
  const isAdmin = can('gestao_utilizadores');
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    businessId: currentBusiness?.id || '',
    role: 'caixa' as BusinessRole,
  });

  const [editingRole, setEditingRole] = useState<{ userId: string; businessId: string } | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<BusinessRole>('caixa');

  const loadUsers = async () => {
    try {
      setLoading(true);
      if (!currentBusiness?.id) {
        setUsers([]);
        return;
      }
      const data = await listBusinessUsers(currentBusiness.id);
      setUsers(data);
    } catch (err: unknown) {
      toast({
        title: 'Erro ao carregar utilizadores',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [currentBusiness?.id]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBusinessUser({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        businessId: formData.businessId || currentBusiness?.id || '',
        role: formData.role,
      });
      toast({
        title: 'Utilizador adicionado',
        description: `${formData.name} foi associado ao negócio com o papel ${ROLE_LABELS[formData.role]}.`,
      });
      setDialogOpen(false);
      setFormData({ email: '', password: '', name: '', businessId: currentBusiness?.id || '', role: 'caixa' });
      loadUsers();
    } catch (err: unknown) {
      toast({
        title: 'Erro ao adicionar utilizador',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = async (userId: string, businessId: string, newRole: BusinessRole) => {
    try {
      await updateBusinessUserRole(userId, businessId, newRole);
      toast({
        title: 'Papel atualizado',
        description: `Papel alterado para ${ROLE_LABELS[newRole]}.`,
      });
      loadUsers();
    } catch (err: unknown) {
      toast({
        title: 'Erro ao alterar papel',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setEditingRole(null);
    }
  };

  const handleDeactivate = async (userId: string, businessId: string) => {
    try {
      await deactivateBusinessUser(userId, businessId);
      toast({ title: 'Acesso removido' });
      loadUsers();
    } catch (err: unknown) {
      toast({
        title: 'Erro ao remover acesso',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">Acesso restrito</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Apenas administradores podem gerir utilizadores e papéis do negócio.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Utilizadores</h1>
          <p className="text-sm text-muted-foreground">
            Gerir acesso ao negócio {currentBusiness?.name || ''} · o seu papel: {role ? ROLE_LABELS[role] : '-'}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Utilizador
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Utilizadores do Negócio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Nenhum utilizador encontrado no negócio atual. Associe o primeiro utilizador com o botão acima.
              </p>
            </div>
          ) : (
            <div className="list-panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground border-b">
                    <th className="pb-2 pr-4">Nome</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Papel</th>
                    <th className="pb-2 pr-4">Estado</th>
                    <th className="pb-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.user_id === authUser?.id;
                    return (
                      <tr key={`${u.user_id}-${u.business_id}`} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-medium truncate max-w-[180px]">
                          {u.name}
                          {isSelf && <Badge variant="outline" className="ml-2 text-[10px]">você</Badge>}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground truncate max-w-[220px]">{u.email}</td>
                        <td className="py-2.5 pr-4">
                          {editingRole?.userId === u.user_id ? (
                            <div className="flex items-center gap-2">
                              <Select value={editRoleValue} onValueChange={(v) => setEditRoleValue(v as BusinessRole)}>
                                <SelectTrigger className="h-8 w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                disabled={isSelf}
                                onClick={() => handleChangeRole(u.user_id, u.business_id, editRoleValue)}
                              >
                                <Check className="h-3 w-3 mr-1" /> Guardar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingRole(null)}>
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className={`text-xs ${ROLE_BADGE_CLASSES[u.role] || ROLE_BADGE_CLASSES.caixa}`}>
                              {ROLE_LABELS[u.role] || u.role}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          {u.active ? (
                            <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 bg-green-500/10">
                              <Check className="h-3 w-3 mr-1" /> Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-red-500/30 text-red-600 bg-red-500/10">
                              <Ban className="h-3 w-3 mr-1" /> Inativo
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSelf}
                              onClick={() => {
                                setEditingRole({ userId: u.user_id, businessId: u.business_id });
                                setEditRoleValue(u.role);
                              }}
                            >
                              Alterar papel
                            </Button>
                            {u.active && (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isSelf}
                                onClick={() => handleDeactivate(u.user_id, u.business_id)}
                              >
                                <Ban className="h-3 w-3 mr-1" /> Remover acesso
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Utilizador ao Negócio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do utilizador"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Senha temporária</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Senha para o primeiro acesso"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Negócio</Label>
              <Select
                value={formData.businessId}
                onValueChange={(v) => setFormData({ ...formData, businessId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar negócio" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {b.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as BusinessRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Adicionar Utilizador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}