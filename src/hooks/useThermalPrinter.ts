import { useState, useCallback } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { generateReceipt, printToThermal } from '@/lib/thermalPrinter';
import { Sale } from '@/types';
import { toast } from './use-toast';
import { supabase } from '@/lib/supabase';

interface PrinterConfig {
  width: number;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  nuit?: string;
}

export function useThermalPrinter() {
  const { business } = useBusiness();
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null);

  // Carregar configuração da impressora
  const loadPrinterConfig = useCallback(async () => {
    if (!business?.id) return;

    try {
      const { data, error } = await supabase
        .from('printer_settings')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_default', true)
        .eq('active', true)
        .single();

      if (error) {
        console.warn('Nenhuma configuração de impressora encontrada, usando padrão');
        return;
      }

      if (data) {
        setPrinterConfig({
          width: data.char_width || 48,
          businessName: business.name || 'KYNITAS BAR',
          businessAddress: business.address,
          businessPhone: business.phone,
          nuit: business.nuit,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração da impressora:', error);
    }
  }, [business]);

  // Imprimir recibo
  const printReceipt = useCallback(async (sale: Sale) => {
    if (!sale) {
      toast({
        title: 'Erro',
        description: 'Dados da venda inválidos',
        variant: 'destructive',
      });
      return false;
    }

    setIsPrinting(true);

    try {
      // Usar configuração carregada ou padrão
      const config: PrinterConfig = printerConfig || {
        width: 48,
        businessName: business?.name || 'KYNITAS BAR',
        businessAddress: business?.address,
        businessPhone: business?.phone,
        nuit: business?.nuit,
      };

      // Gerar conteúdo ESC/POS
      const receiptContent = generateReceipt(sale, config);

      // Registrar trabalho de impressão na base de dados
      if (business?.id) {
        await supabase.from('print_jobs').insert({
          business_id: business.id,
          job_type: 'receipt',
          reference_id: sale.id,
          content: receiptContent,
          status: 'pending',
        });
      }

      // Tentar imprimir
      await printToThermal(receiptContent);

      // Atualizar status para completado
      if (business?.id) {
        await supabase
          .from('print_jobs')
          .update({ status: 'completed', printed_at: new Date().toISOString() })
          .eq('reference_id', sale.id)
          .eq('job_type', 'receipt');
      }

      toast({
        title: 'Recibo impresso',
        description: 'Recibo enviado para a impressora com sucesso',
      });

      return true;
    } catch (error) {
      console.error('Erro ao imprimir recibo:', error);

      // Registrar erro na base de dados
      if (business?.id) {
        await supabase
          .from('print_jobs')
          .update({
            status: 'failed',
            error_message: (error as Error).message,
          })
          .eq('reference_id', sale.id)
          .eq('job_type', 'receipt');
      }

      toast({
        title: 'Erro ao imprimir',
        description: (error as Error).message || 'Verifique a conexão com a impressora',
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [business, printerConfig]);

  // Testar impressora
  const testPrinter = useCallback(async () => {
    setIsPrinting(true);

    try {
      const config: PrinterConfig = printerConfig || {
        width: 48,
        businessName: business?.name || 'KYNITAS BAR',
        businessAddress: business?.address,
        businessPhone: business?.phone,
        nuit: business?.nuit,
      };

      // Criar recibo de teste
      const testSale: Sale = {
        id: 'test-' + Date.now(),
        items: [
          {
            productId: 'test-1',
            product: {
              id: 'test-1',
              name: 'Produto de Teste',
              price: 100,
              category: 'test',
              type: 'drink',
              stock: 10,
              costPrice: 50,
            },
            quantity: 1,
            subtotal: 100,
          },
        ],
        total: 100,
        paymentDetails: {
          cash: 100,
          mpesa: 0,
          emola: 0,
          card: 0,
          total: 100,
          change: 0,
        },
        createdAt: new Date(),
      };

      const receiptContent = generateReceipt(testSale, config);
      await printToThermal(receiptContent);

      // Atualizar último teste
      if (business?.id) {
        await supabase
          .from('printer_settings')
          .update({ last_test_at: new Date().toISOString() })
          .eq('business_id', business.id)
          .eq('is_default', true);
      }

      toast({
        title: 'Teste concluído',
        description: 'Impressora está funcionando corretamente',
      });

      return true;
    } catch (error) {
      console.error('Erro no teste de impressão:', error);

      toast({
        title: 'Teste falhou',
        description: (error as Error).message,
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [business, printerConfig]);

  return {
    isPrinting,
    printerConfig,
    loadPrinterConfig,
    printReceipt,
    testPrinter,
  };
}
