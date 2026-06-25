import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Tag, Users, Save, Building2, Printer, Database, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStore } from '@/store/useStore';
import { useBusiness } from '@/contexts/BusinessContext';
import { useInvoices } from '@/hooks/useInvoices';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { PrinterSettings } from '@/components/settings/PrinterSettings';
import { BackupSettings } from '@/components/settings/BackupSettings';
import { CashDrawerSettings } from '@/components/settings/CashDrawerSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import UsersPage from '@/pages/settings/Users';

const defaultCategories = {
  drinks: ['Cervejas', 'Vinhos', 'Destilados', 'Cocktails', 'Não Alcoólicas', 'Cidras', 'Gins', 'Whiskys', 'Rum', 'Licores', 'Coolers', 'Energéticos', 'Refrigerantes', 'Sumos', 'Águas'],
  meals: ['Entradas', 'Frutos do Mar', 'Carnes', 'Tradicionais', 'Sobremesas'],
};

export default function Settings() {
  const { user, setUser } = useStore();
  const { business, refreshBusiness } = useBusiness();
  const { invoiceSeries } = useInvoices();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
  });
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    address: '',
    phone: '',
    nuit: '',
  });
  const [categories, setCategories] = useState(defaultCategories);
  const [newCategory, setNewCategory] = useState({ drinks: '', meals: '' });

  useEffect(() => {
    if (business) {
      setBusinessInfo({
        name: business.name || '',
        address: business.address || '',
        phone: business.phone || '',
        nuit: business.nuit || '',
      });
      loadCategories();
    }
  }, [business]);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  const loadCategories = async () => {
    if (!business?.id) return;

    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('setting_value')
        .eq('business_id', business.id)
        .eq('setting_key', 'categories')
        .single();

      if (data && !error) {
        setCategories(data.setting_value as typeof defaultCategories);
      }
    } catch (error) {
      console.log('Nenhuma categoria salva ainda');
    }
  };

  const saveCategories = async () => {
    if (!business?.id) return;

    try {
      const { error } = await supabase
        .from('business_settings')
        .upsert({
          business_id: business.id,
          setting_key: 'categories',
          setting_value: categories,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'business_id,setting_key'
        });

      if (error) throw error;

      toast({ title: 'Categorias guardadas com sucesso!' });
    } catch (error) {
      console.error('Erro ao guardar categorias:', error);
      toast({
        title: 'Erro ao guardar categorias',
        variant: 'destructive',
      });
    }
  };

  const handleSaveProfile = () => {
    if (user) {
      setUser({ ...user, ...profile });
      toast({ title: 'Perfil atualizado com sucesso!' });
    }
  };

  const handleSaveBusiness = async () => {
    if (!business?.id) {
      toast({
        title: 'Erro',
        description: 'Negócio não encontrado',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Salvando negócio:', businessInfo);
      
      const { data, error } = await supabase
        .from('businesses')
        .update({
          name: businessInfo.name,
          address: businessInfo.address,
          phone: businessInfo.phone,
          nuit: businessInfo.nuit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', business.id)
        .select();

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      console.log('Negócio atualizado:', data);
      await refreshBusiness();
      toast({ title: 'Informações do negócio atualizadas!' });
    } catch (error: unknown) {
      console.error('Erro ao atualizar negócio:', error);
      toast({
        title: 'Erro ao atualizar',
        description: getErrorMessage(error, 'Tente novamente'),
        variant: 'destructive',
      });
    }
  };

  const addCategory = async (type: 'drinks' | 'meals') => {
    const value = newCategory[type].trim();
    if (value && !categories[type].includes(value)) {
      const newCategories = {
        ...categories,
        [type]: [...categories[type], value],
      };
      setCategories(newCategories);
      setNewCategory({ ...newCategory, [type]: '' });
      
      // Save to database
      if (business?.id) {
        try {
          await supabase
            .from('business_settings')
            .upsert({
              business_id: business.id,
              setting_key: 'categories',
              setting_value: newCategories,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'business_id,setting_key'
            });
        } catch (error) {
          console.error('Erro ao salvar categoria:', error);
        }
      }
      
      toast({ title: `Categoria "${value}" adicionada` });
    }
  };

  const removeCategory = async (type: 'drinks' | 'meals', category: string) => {
    const newCategories = {
      ...categories,
      [type]: categories[type].filter(c => c !== category),
    };
    setCategories(newCategories);
    
    // Save to database
    if (business?.id) {
      try {
        await supabase
          .from('business_settings')
          .upsert({
            business_id: business.id,
            setting_key: 'categories',
            setting_value: newCategories,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'business_id,setting_key'
          });
      } catch (error) {
        console.error('Erro ao salvar categoria:', error);
      }
    }
    
    toast({ title: `Categoria "${category}" removida` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground">Gerir preferências do sistema</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            Negócio
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            Funcionários
          </TabsTrigger>
          <TabsTrigger value="printer" className="gap-2">
            <Printer className="h-4 w-4" />
            Impressora
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="cashdrawer" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Gaveta
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2">
            <FileText className="h-4 w-4" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utilizadores
          </TabsTrigger>
        </TabsList>

        {/* Business Tab */}
        <TabsContent value="business" className="animate-fade-in">
          <div className="bg-card border rounded-xl p-6 max-w-2xl">
            <h3 className="text-lg font-semibold mb-6">Informações do Negócio</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nome do Estabelecimento</Label>
                <Input
                  id="businessName"
                  value={businessInfo.name}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                   placeholder="Marrengula IT"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço / Localização</Label>
                <Input
                  id="address"
                  value={businessInfo.address}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                  placeholder="Av. Julius Nyerere, Maputo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={businessInfo.phone}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                  placeholder="+258 84 000 0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nuit">NUIT</Label>
                <Input
                  id="nuit"
                  value={businessInfo.nuit}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, nuit: e.target.value })}
                  placeholder="000000000"
                />
              </div>

              <Button variant="gradient" onClick={handleSaveBusiness}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Alterações
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="animate-fade-in">
          <div className="bg-card border rounded-xl p-6 max-w-2xl">
            <h3 className="text-lg font-semibold mb-6">Informações do Perfil</h3>
            
            <div className="flex items-center gap-6 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profile.name.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile.name || 'Utilizador'}</p>
                <p className="text-sm text-muted-foreground capitalize">{user?.role || 'Admin'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">URL do Avatar</Label>
                <Input
                  id="avatar"
                  value={profile.avatar}
                  onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <Button variant="gradient" onClick={handleSaveProfile}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Alterações
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="animate-fade-in">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Drink Categories */}
            <div className="bg-card border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Categorias de Bebidas</h3>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Nova categoria..."
                  value={newCategory.drinks}
                  onChange={(e) => setNewCategory({ ...newCategory, drinks: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory('drinks')}
                />
                <Button onClick={() => addCategory('drinks')}>Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.drinks.map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="pr-1 cursor-pointer hover:bg-destructive/20 transition-colors"
                    onClick={() => removeCategory('drinks', cat)}
                  >
                    {cat}
                    <span className="ml-2 text-destructive">×</span>
                  </Badge>
                ))}
              </div>
              <Button variant="gradient" onClick={saveCategories} className="mt-4 w-full">
                <Save className="h-4 w-4 mr-2" />
                Guardar Categorias
              </Button>
            </div>

            {/* Meal Categories */}
            <div className="bg-card border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Categorias de Refeições</h3>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Nova categoria..."
                  value={newCategory.meals}
                  onChange={(e) => setNewCategory({ ...newCategory, meals: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory('meals')}
                />
                <Button onClick={() => addCategory('meals')}>Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.meals.map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="pr-1 cursor-pointer hover:bg-destructive/20 transition-colors"
                    onClick={() => removeCategory('meals', cat)}
                  >
                    {cat}
                    <span className="ml-2 text-destructive">×</span>
                  </Badge>
                ))}
              </div>
              <Button variant="gradient" onClick={saveCategories} className="mt-4 w-full">
                <Save className="h-4 w-4 mr-2" />
                Guardar Categorias
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="animate-fade-in">
          <div className="bg-card border rounded-xl p-6 max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Gestão de Funcionários</h3>
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Funcionalidade em desenvolvimento</p>
              <p className="text-sm">A gestão de funcionários estará disponível em breve</p>
            </div>
          </div>
        </TabsContent>

        {/* Printer Tab */}
        <TabsContent value="printer" className="animate-fade-in">
          <div className="max-w-2xl">
            <PrinterSettings />
          </div>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="animate-fade-in">
          <div className="max-w-2xl">
            <BackupSettings />
          </div>
        </TabsContent>

        {/* Cash Drawer Tab */}
        <TabsContent value="cashdrawer" className="animate-fade-in">
          <div className="max-w-2xl">
            <CashDrawerSettings />
          </div>
        </TabsContent>

        {/* Fiscal Tab */}
        <TabsContent value="fiscal" className="animate-fade-in">
          <div className="bg-card border rounded-xl p-6 max-w-2xl">
            <h3 className="text-lg font-semibold mb-6">Configuração Fiscal</h3>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Séries de Documentos</h4>
                <div className="space-y-3">
                  {invoiceSeries.map(series => (
                    <div key={series.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{series.prefix}</p>
                        <p className="text-sm text-muted-foreground">
                          {series.documentType === 'FT' ? 'Factura' :
                           series.documentType === 'FS' ? 'Factura Simplificada' :
                           series.documentType === 'FC' ? 'Factura Consumidor Final' : 'Nota de Crédito'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Nº actual: <span className="font-mono font-medium">{series.currentNumber}</span></p>
                        <p className="text-xs text-muted-foreground">Início: {series.startNumber}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-2">IVA (Imposto sobre o Valor Acrescentado)</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Taxa standard: <strong>16%</strong> | Reduzida: <strong>10%</strong> | Isenta: <strong>0%</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  A taxa de IVA de cada produto é configurada individualmente nas páginas de
                  {' '}<strong>Bebidas</strong>, <strong>Refeições</strong> ou <strong>Stock</strong>.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="animate-fade-in">
          <UsersPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
