import { useState, useEffect } from 'react';
import { Building2, Users, TrendingUp, Settings, Plus, Edit, Trash2, Eye, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';

interface BusinessStats {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  active: boolean;
  userCount: number;
  salesCount: number;
  totalRevenue: number;
  lastActivity?: string;
}

interface BusinessUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  business_name: string;
  created_at: string;
}

export function CentralAdminPanel() {
  const { currentBusinessUser } = useBusiness();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [businessStats, setBusinessStats] = useState<BusinessStats[]>([]);
  const [allUsers, setAllUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);

  // Verificar se é super admin
  const isSuperAdmin = currentBusinessUser?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      loadBusinessStats();
      loadAllUsers();
    }
  }, [isSuperAdmin]);

  const loadBusinessStats = async () => {
    try {
      // Carregar estatísticas de todos os bares
      const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('*');

      if (bizError) throw bizError;

      const stats: BusinessStats[] = [];

      for (const business of businesses || []) {
        // Contar usuários
        const { count: userCount } = await supabase
          .from('business_users')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .eq('active', true);

        // Contar vendas
        const { count: salesCount } = await supabase
          .from('sales')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id);

        // Calcular receita total
        const { data: salesData } = await supabase
          .from('sales')
          .select('total')
          .eq('business_id', business.id);

        const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;

        // Última atividade
        const { data: lastSale } = await supabase
          .from('sales')
          .select('created_at')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        stats.push({
          id: business.id,
          name: business.name,
          slug: business.slug,
          address: business.address,
          phone: business.phone,
          active: business.active,
          userCount: userCount || 0,
          salesCount: salesCount || 0,
          totalRevenue,
          lastActivity: lastSale?.created_at,
        });
      }

      setBusinessStats(stats);
    } catch (error: unknown) {
      console.error('Erro ao carregar estatísticas:', error);
      toast({
        title: "Erro ao carregar dados",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('business_users')
        .select(`
          id,
          role,
          active,
          created_at,
          businesses!inner(name),
          auth.users!inner(email, raw_user_meta_data)
        `);

      if (error) throw error;

      const users: BusinessUser[] = data?.map((item: any) => ({
        id: item.id,
        name: item.auth?.users?.raw_user_meta_data?.name || 'Sem nome',
        email: item.auth?.users?.email || '',
        role: item.role,
        active: item.active,
        business_name: item.businesses?.name || '',
        created_at: item.created_at,
      })) || [];

      setAllUsers(users);
    } catch (error: unknown) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleBusinessStatus = async (businessId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ active })
        .eq('id', businessId);

      if (error) throw error;

      toast({
        title: active ? "Bar ativado" : "Bar desativado",
        description: "Status atualizado com sucesso",
      });

      loadBusinessStats();
    } catch (error: unknown) {
      toast({
        title: "Erro ao atualizar status",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('business_users')
        .update({ active })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: active ? "Usuário ativado" : "Usuário desativado",
        description: "Status atualizado com sucesso",
      });

      loadAllUsers();
    } catch (error: unknown) {
      toast({
        title: "Erro ao atualizar usuário",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  if (!isSuperAdmin) {
    return (
      <Alert>
        <Crown className="h-4 w-4" />
        <AlertDescription>
          Acesso restrito a Super Administradores. Você precisa de permissões especiais para acessar esta área.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados administrativos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-yellow-500" />
          <h1 className="text-2xl font-bold">Administração Central</h1>
          <Badge variant="secondary">Super Admin</Badge>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Estabelecimento
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Bares</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businessStats.length}</div>
            <p className="text-xs text-muted-foreground">
              {businessStats.filter(b => b.active).length} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              {allUsers.filter(u => u.active).length} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businessStats.reduce((sum, b) => sum + b.totalRevenue, 0).toLocaleString('pt-MZ', {
                style: 'currency',
                currency: 'MZN'
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Todos os estabelecimentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businessStats.reduce((sum, b) => sum + b.salesCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Todas as transações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="businesses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="businesses">Estabelecimentos</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="businesses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Estabelecimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Receita</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businessStats.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{business.name}</div>
                          <div className="text-sm text-muted-foreground">{business.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {business.address || 'Não informado'}
                          {business.phone && (
                            <div className="text-muted-foreground">{business.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{business.userCount}</TableCell>
                      <TableCell>{business.salesCount}</TableCell>
                      <TableCell>
                        {business.totalRevenue.toLocaleString('pt-MZ', {
                          style: 'currency',
                          currency: 'MZN'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={business.active ? 'default' : 'secondary'}>
                          {business.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={business.active ? "destructive" : "default"}
                            onClick={() => toggleBusinessStatus(business.id, !business.active)}
                          >
                            {business.active ? 'Desativar' : 'Ativar'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estabelecimento</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.business_name}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                          {user.role === 'super_admin' && <Crown className="h-3 w-3 mr-1" />}
                          {user.role === 'super_admin' ? 'Super Admin' :
                           user.role === 'owner' ? 'Proprietário' :
                           user.role === 'manager' ? 'Gerente' : 'Staff'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'default' : 'secondary'}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={user.active ? "destructive" : "default"}
                            onClick={() => toggleUserStatus(user.id, !user.active)}
                            disabled={user.role === 'super_admin'}
                          >
                            {user.active ? 'Desativar' : 'Ativar'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Consolidados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Relatórios e análises consolidadas de todos os estabelecimentos serão implementados aqui.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configurações globais do sistema multi-tenant serão implementadas aqui.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CentralAdminPanel;