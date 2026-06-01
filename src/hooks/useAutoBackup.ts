import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from './use-toast';

export function useAutoBackup() {
  const { currentBusiness } = useBusiness();

  useEffect(() => {
    if (!currentBusiness?.id) return;

    const createBackup = async () => {
      try {
        const businessId = currentBusiness.id;
        const timestamp = new Date().toISOString();
        const date = timestamp.split('T')[0];

        // Buscar dados
        const [salesRes, productsRes] = await Promise.all([
          supabase.from('sales').select('*').eq('business_id', businessId).limit(1000),
          supabase.from('products').select('*').eq('business_id', businessId),
        ]);

        const backupData = {
          version: '1.0',
          businessId,
          businessName: currentBusiness.name,
          timestamp,
          data: {
            sales: salesRes.data || [],
            products: productsRes.data || [],
          },
          stats: {
            totalSales: salesRes.data?.length || 0,
            totalProducts: productsRes.data?.length || 0,
          },
        };

        // Salvar no localStorage
        const backupKey = `backup_${businessId}_${date}`;
        localStorage.setItem(backupKey, JSON.stringify(backupData));

        // Manter apenas últimos 7 backups
        cleanOldBackups(businessId);

        console.log('✅ Backup automático criado:', backupKey);
      } catch (error) {
        console.error('❌ Erro ao criar backup:', error);
      }
    };

    const cleanOldBackups = (businessId: string) => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(`backup_${businessId}_`));
      if (keys.length > 7) {
        keys.sort().slice(0, keys.length - 7).forEach(k => localStorage.removeItem(k));
      }
    };

    // Backup imediato ao carregar
    createBackup();

    // Backup a cada 6 horas
    const interval = setInterval(createBackup, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentBusiness?.id]);
}

export function listBackups(businessId: string) {
  return Object.keys(localStorage)
    .filter(k => k.startsWith(`backup_${businessId}_`))
    .map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return {
          key,
          date: data.timestamp,
          stats: data.stats,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b!.date).getTime() - new Date(a!.date).getTime());
}

export function restoreBackup(backupKey: string) {
  try {
    const backup = JSON.parse(localStorage.getItem(backupKey) || '{}');
    return backup.data;
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    return null;
  }
}

export function downloadBackup(backupKey: string) {
  const backup = localStorage.getItem(backupKey);
  if (!backup) return;

  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${backupKey}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
