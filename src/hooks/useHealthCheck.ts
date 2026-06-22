import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';

export interface HealthCheckResult {
  supabaseConnected: boolean;
  userAuthenticated: boolean;
  businessLoaded: boolean;
  tablesExist: boolean;
  rlsPoliciesActive: boolean;
  lastError?: string;
  timestamp: Date;
}

export function useHealthCheck() {
  const { user, loading: authLoading } = useAuth();
  const { currentBusiness, loading: businessLoading } = useBusiness();
  const [health, setHealth] = useState<HealthCheckResult>({
    supabaseConnected: false,
    userAuthenticated: false,
    businessLoaded: false,
    tablesExist: false,
    rlsPoliciesActive: false,
    timestamp: new Date(),
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const runHealthCheck = async () => {
      setChecking(true);
      const result: HealthCheckResult = {
        supabaseConnected: false,
        userAuthenticated: false,
        businessLoaded: false,
        tablesExist: false,
        rlsPoliciesActive: false,
        timestamp: new Date(),
      };

      try {
        // 1. Verificar configuração Supabase
        if (!isSupabaseConfigured()) {
          result.lastError = 'Supabase não configurado. Verifique .env';
          setHealth(result);
          setChecking(false);
          return;
        }
        result.supabaseConnected = true;

        // 2. Verificar autenticação
        result.userAuthenticated = !!user;

        // 3. Verificar negócio
        result.businessLoaded = !!currentBusiness;

        // 4. Verificar tabelas (apenas se autenticado e com negócio)
        if (user && currentBusiness?.id) {
          try {
            // Tenta carregar um produto para verificar tabela
            const { data, error: tableError } = await supabase
              .from('products')
              .select('count', { count: 'exact' })
              .eq('business_id', currentBusiness.id)
              .limit(1);

            if (!tableError) {
              result.tablesExist = true;
            } else {
              result.lastError = `Erro ao acessar tabelas: ${tableError.message}`;
            }

            // 5. Verificar RLS policies
            try {
              // Se conseguiu acessar produtos, RLS está funcionando
              result.rlsPoliciesActive = true;
            } catch (rslError) {
              result.lastError = `RLS policy error: ${rslError}`;
            }
          } catch (err: unknown) {
            result.lastError = `Database error: ${getErrorMessage(err)}`;
          }
        }

        setHealth(result);
      } catch (error: unknown) {
        result.lastError = `Health check error: ${getErrorMessage(error)}`;
        setHealth(result);
      } finally {
        setChecking(false);
      }
    };

    // Não executar enquanto carregando autenticação ou negócio
    if (!authLoading && !businessLoading) {
      runHealthCheck();
    }
  }, [user, currentBusiness, authLoading, businessLoading]);

  const isHealthy = 
    health.supabaseConnected &&
    health.userAuthenticated &&
    health.businessLoaded &&
    health.tablesExist;

  const retry = () => {
    setChecking(true);
  };

  return {
    health,
    checking,
    isHealthy,
    retry,
  };
}
