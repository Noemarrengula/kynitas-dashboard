import { useState } from 'react';
import { openCashDrawer, testCashDrawer, CashDrawerConfig } from '@/lib/cashDrawer';
import { toast } from 'sonner';

export const useCashDrawer = () => {
  const [isOpening, setIsOpening] = useState(false);

  const getConfig = (): CashDrawerConfig | null => {
    const config = localStorage.getItem('cashDrawerConfig');
    return config ? JSON.parse(config) : null;
  };

  const saveConfig = (config: CashDrawerConfig) => {
    localStorage.setItem('cashDrawerConfig', JSON.stringify(config));
  };

  const open = async () => {
    const config = getConfig();
    if (!config) {
      // Gaveta não configurada - modo manual
      return false;
    }

    setIsOpening(true);
    try {
      const success = await openCashDrawer(config);
      if (success) {
        toast.success('Gaveta aberta');
      } else {
        toast.error('Erro ao abrir gaveta');
      }
      return success;
    } finally {
      setIsOpening(false);
    }
  };

  const test = async (config: CashDrawerConfig) => {
    setIsOpening(true);
    try {
      const success = await testCashDrawer(config);
      if (success) {
        toast.success('Gaveta testada com sucesso');
      } else {
        toast.error('Falha no teste da gaveta');
      }
      return success;
    } finally {
      setIsOpening(false);
    }
  };

  return { open, test, saveConfig, getConfig, isOpening };
};
