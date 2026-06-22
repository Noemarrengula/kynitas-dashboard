import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create profile if doesn't exist
        const newProfile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          avatar: user.user_metadata?.avatar_url || '',
        };

        const { data: created, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) throw createError;
        setProfile(created);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) {
      console.error('Perfil não carregado');
      toast({
        title: 'Erro',
        description: 'Perfil não carregado. Execute o script supabase-settings.sql',
        variant: 'destructive',
      });
      return false;
    }

    try {
      console.log('Atualizando perfil:', updates);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select();

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      console.log('Perfil atualizado:', data);
      setProfile({ ...profile, ...updates });
      toast({ title: 'Perfil atualizado com sucesso!' });
      return true;
    } catch (error: unknown) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: 'Erro ao atualizar perfil',
        description: getErrorMessage(error, 'Verifique o console para mais detalhes'),
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refreshProfile: loadProfile,
  };
}
