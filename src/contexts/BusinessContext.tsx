import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage, setStoreCurrency as setUtilsCurrency } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import type { BusinessRole, BusinessUser } from '@/types/domains/user';

interface Business {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  nuit?: string;
  currency?: string;
}

interface BusinessUsersJoined {
  business_id: string;
  role: BusinessRole;
  businesses: Business;
}

interface BusinessContextType {
  business: Business | null;
  currentBusiness: Business | null;
  businesses: Business[];
  currentBusinessUser: BusinessUser | null;
  userRole: BusinessRole | null;
  loading: boolean;
  switchBusiness: (businessId: string) => void;
  refreshBusiness: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessUser, setCurrentBusinessUser] = useState<BusinessUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadBusinesses = async () => {
    if (!user) {
      setLoading(false);
      setBusinesses([]);
      setCurrentBusiness(null);
      setCurrentBusinessUser(null);
      return;
    }

    try {
      const { data: rawData, error } = await supabase
        .from('business_users')
        .select('business_id, role, businesses(*)')
        .eq('user_id', user.id)
        .eq('active', true);

      if (error) throw error;

      const data = (rawData ?? []) as unknown as BusinessUsersJoined[];

      const businessList: Business[] = data.map(item => ({
        ...item.businesses,
        userRole: item.role as BusinessRole,
      }));

      setBusinesses(businessList);

      const savedBusinessId = localStorage.getItem('currentBusinessId');
      const business = businessList.find(b => b.id === savedBusinessId) || businessList[0];

      if (business) {
        setCurrentBusiness(business);
        const cur = business.currency || 'MZN';
        useStore.getState().setCurrency(cur);
        setUtilsCurrency(cur);

        const businessUser = data.find(d => d.business_id === business.id);
        if (businessUser) {
          setCurrentBusinessUser({
            user_id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || '',
            role: businessUser.role as BusinessRole,
            active: true,
            business_id: business.id,
            business_name: business.name,
            created_at: new Date().toISOString(),
          });
        }

        localStorage.setItem('currentBusinessId', business.id);
      }
    } catch (error: unknown) {
      toast({
        title: "Erro ao carregar negócios",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [user]);

  const switchBusiness = async (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setCurrentBusiness(business);
      const cur = business.currency || 'MZN';
      useStore.getState().setCurrency(cur);
      setUtilsCurrency(cur);

      try {
        const { data, error } = await supabase
          .from('business_users')
          .select('role')
          .eq('business_id', businessId)
          .eq('user_id', user?.id)
          .single();

        if (error) throw error;

        if (data && user) {
          setCurrentBusinessUser({
            user_id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || '',
            role: data.role as BusinessRole,
            active: true,
            business_id: business.id,
            business_name: business.name,
            created_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Erro ao buscar role do usuário:', err);
      }

      localStorage.setItem('currentBusinessId', businessId);
      toast({
        title: "Negócio alterado",
        description: `Agora você está gerenciando ${business.name}`,
      });
    }
  };

  const refreshBusiness = async () => {
    await loadBusinesses();
  };

  return (
    <BusinessContext.Provider value={{
      business: currentBusiness,
      currentBusiness,
      businesses,
      currentBusinessUser,
      userRole: currentBusinessUser?.role ?? null,
      loading,
      switchBusiness,
      refreshBusiness,
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
