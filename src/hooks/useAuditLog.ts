import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditEntry {
  id: string;
  businessId: string;
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export function useAuditLog() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();

  const log = useCallback(async (
    action: string,
    entity: string,
    entityId?: string,
    details?: Record<string, unknown>,
  ) => {
    if (!currentBusiness?.id) return;

    try {
      await supabase.from('audit_logs').insert({
        business_id: currentBusiness.id,
        user_id: user?.id,
        user_name: user?.user_metadata?.name || user?.email,
        action,
        entity,
        entity_id: entityId,
        details,
      });
    } catch (err) {
      console.error('Audit log error:', err);
    }
  }, [currentBusiness?.id, user]);

  return { log };
}
