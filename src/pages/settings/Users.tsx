import { useState, useEffect } from 'react';
import { Users, Plus, Mail, Shield, Ban, Check, Loader2, Building2 } from 'lucide-react';
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
import { usePermissions, ROLE_LABELS } from '@/hooks/usePermissions';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  createBusinessUser,
  listBusinessUsers,
  deactivateBusinessUser,
} from '@/lib/supabase-admin';
import type { BusinessUser } from '@/types/domains/user';

export default function UsersPage() {
  const { businesses, currentBusiness } = useBusiness();
  const { isSuperAdmin } = usePermissions();
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    businessId: currentBusiness?.id || '',
    role: 'manager' as 'manager' | 'staff',
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await listBusinessUsers();
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

  useEffect(() => { loadUsers(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBusinessUser(formData);
      toast({
        title: 'Utilizador criado',
        description: `${formData.name} foi associado ao bar com sucesso.`,
      });
      setDialogOpen(false);
      setFormData({ email: '', password: '', name: '', businessId: currentBusiness?.id || '', role: 'manager' });
      loadUsers();
    } catch (err: unknown) {
      toast({
        title: 'Erro ao criar utilizador',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  const handleDeactivate = async (userId: string, businessId: string) => {
    try {
      await deactivateBusinessUser(userId, businessId);
      toast({ title: 'Utilizador desativado' });
      loadUsers();
    } catch (err: unknown) {
      toast({
        title: 'Erro',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  const roleBadge = (role: string) => {
    const variants: Record<string, string> = {
      super_admin: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
      owner: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
      manager: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
      staff: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
    };
    return variants[role] || variants.staff;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Utilizadores</h1>
          <p className="text-sm text-muted-foreground">Gerir acesso aos bares</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Utilizador
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Utilizadores por Bar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum utilizador encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                <div className="col-span-3">Nome</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Bar</div>
                <div className="col-span-2">Função</div>
                <div className="col-span-2">Estado</div>
              </div>
              {users.map((u) => (
                <div key={`${u.user_id}-${u.business_id}`} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-muted/50 text-sm">
                  <div className="col-span-3 font-medium truncate">{u.name}</div>
                  <div className="col-span-3 text-muted-foreground truncate">{u.email}</div>
                  <div className="col-span-2 flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{u.business_name}</span>
                  </div>
                  <div className="col-span-2">
                    <Badge variant="outline" className={`text-xs ${roleBadge(u.role)}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    {u.active ? (
                      <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 bg-green-500/10">
                        <Check className="h-3 w-3 mr-1" /> Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-red-500/30 text-red-600 bg-red-500/10">
                        <Ban className="h-3 w-3 mr-1" /> Inativo
                      </Badge>
                    )}
                    {isSuperAdmin && u.active && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="h-6 w-6"
                        onClick={() => handleDeactivate(u.user_id, u.business_id)}
                      >
                        <Ban className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Utilizador</DialogTitle>
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
              <Label>Senha</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Senha temporária"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Bar</Label>
              <Select
                value={formData.businessId}
                onValueChange={(v) => setFormData({ ...formData, businessId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar bar" />
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
              <Label>Função</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as 'manager' | 'staff' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="staff">Funcionário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Criar Utilizador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
