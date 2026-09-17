import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from './useAuditLog';
import { useStore } from '@/store/useStore';
import { getOnline, enqueuePendingSale, writeCache, readCache } from '@/lib/offline';
import { Product, Ingredient, Sale, Credit } from '@/types';

interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
}

function isNetworkError(msg?: string): boolean {
  return /fetch|network|offline|failed to fetch/i.test(msg || '');
}

// Mapeamento snake_case (DB) ↔ camelCase (TypeScript)
const DB_FIELD_MAP: Record<string, string> = {
  cost_price: 'costPrice',
  costPrice: 'cost_price',
  preco_dose: 'precoDose',
  precoDose: 'preco_dose',
  doses_por_garrafa: 'dosesPorGarrafa',
  dosesPorGarrafa: 'doses_por_garrafa',
  estimated_cost: 'estimatedCost',
  estimatedCost: 'estimated_cost',
  daily_stock: 'dailyStock',
  dailyStock: 'daily_stock',
  internal_id: 'internal_id',
  business_id: 'businessId',
  businessId: 'business_id',
  created_at: 'createdAt',
  createdAt: 'created_at',
  updated_at: 'updatedAt',
  updatedAt: 'updated_at',
  sale_number: 'saleNumber',
  saleNumber: 'sale_number',
  payment_details: 'paymentDetails',
  paymentDetails: 'payment_details',
  table_id: 'tableId',
  tableId: 'table_id',
  table_number: 'tableNumber',
  tableNumber: 'table_number',
  table_name: 'tableName',
  tableName: 'table_name',
  table_customer_name: 'tableCustomerName',
  tableCustomerName: 'table_customer_name',
  customer_name: 'customerName',
  customerName: 'customer_name',
  customer_id: 'customerId',
  customerId: 'customer_id',
  customer_phone: 'customerPhone',
  customerPhone: 'customer_phone',
  amount_paid: 'amountPaid',
  amountPaid: 'amount_paid',
  remaining_balance: 'remainingBalance',
  remainingBalance: 'remaining_balance',
  last_payment_at: 'lastPaymentAt',
  lastPaymentAt: 'last_payment_at',
  sale_id: 'saleId',
  saleId: 'sale_id',
};

function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[DB_FIELD_MAP[key] || key] = value;
  }
  return result;
}

function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[DB_FIELD_MAP[key] || key] = value;
  }
  return result;
}

export function useDatabase() {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const { log: auditLog } = useAuditLog();
  const products = useStore(s => s.products);
  const ingredients = useStore(s => s.ingredients);
  const sales = useStore(s => s.sales);
  const credits = useStore(s => s.credits);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DatabaseError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Função auxiliar para tratamento de erros
  const handleError = useCallback((err: unknown, operation: string) => {
    const message = err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Erro desconhecido');
    const errorObj: DatabaseError = {
      message,
      code: err && typeof err === 'object' && 'code' in err ? String((err as Record<string, unknown>).code) : undefined,
      details: err && typeof err === 'object' && 'details' in err ? String((err as Record<string, unknown>).details) : undefined,
    };
    
    console.error(`[${operation}]`, errorObj);
    setError(errorObj);
    
    // Mostrar toast para erros de carregamento
    if (operation === 'LOAD_DATA') {
      toast({
        title: 'Erro ao carregar dados',
        description: errorObj.message,
        variant: 'destructive',
      });
    }
    
    return { error: errorObj };
  }, []);

  // Semear estado a partir da cache local (offline). Devolve true se encontrou dados.
  const seedFromCache = (businessId: string): boolean => {
    const productsCache = readCache<Record<string, any>[]>(businessId, 'products');
    const ingredientsCache = readCache<Record<string, any>[]>(businessId, 'ingredients');
    const salesCache = readCache<Record<string, any>[]>(businessId, 'sales');
    const creditsCache = readCache<Record<string, any>[]>(businessId, 'credits');

    if (
      (productsCache?.rows.length || 0) +
      (ingredientsCache?.rows.length || 0) +
      (salesCache?.rows.length || 0) +
      (creditsCache?.rows.length || 0) === 0
    ) {
      return false;
    }

    if (productsCache?.rows) {
      useStore.getState().setProducts(productsCache.rows.map(p => toCamelCase(p) as Product));
    }
    if (ingredientsCache?.rows) {
      useStore.getState().setIngredients(ingredientsCache.rows.map(i => toCamelCase(i) as Ingredient));
    }
    if (salesCache?.rows) {
      const transformedSales = salesCache.rows.map(sale => ({
        ...toCamelCase(sale),
        paymentDetails: sale.payment_details || {},
        createdAt: sale.created_at,
      }));
      useStore.getState().setSales(transformedSales as unknown as Sale[]);
    }
    if (creditsCache?.rows) {
      const transformedCredits: Credit[] = creditsCache.rows.map(credit => ({
        id: credit.id,
        customerName: credit.customer_name,
        customerPhone: credit.customer_phone,
        items: credit.items,
        total: credit.total,
        amountPaid: credit.amount_paid || 0,
        remainingBalance: credit.remaining_balance,
        status: credit.status,
        createdAt: credit.created_at,
        updatedAt: credit.updated_at,
        lastPaymentAt: credit.last_payment_at,
        notes: credit.notes,
        saleId: credit.sale_id,
      }));
      useStore.getState().setCredits(transformedCredits);
    }

    return true;
  };

  // Dedução de stock local (mesma lógica nos caminhos online e offline)
  const applyLocalStockDeduction = (sale: Omit<Sale, 'id'>) => {
    const updatedProducts = useStore.getState().products.map(product => {
      const saleItems = sale.items.filter(item => item.productId === product.id);
      if (saleItems.length === 0) return product;

      let totalDeduction = 0;
      saleItems.forEach(item => {
        const isDose = item.product?.name?.includes('(Dose)') || false;
        if (isDose && product.dosesPorGarrafa && product.dosesPorGarrafa > 0) {
          totalDeduction += item.quantity / product.dosesPorGarrafa;
        } else {
          totalDeduction += item.quantity;
        }
      });

      return { ...product, stock: Math.max(0, product.stock - totalDeduction) };
    });
    useStore.getState().setProducts(updatedProducts);
  };

  // Guarda venda apenas localmente (offline) e coloca na fila de sincronização
  const saveSaleOffline = (sale: Omit<Sale, 'id'>) => {
    if (!currentBusiness?.id) {
      return { data: null, error: { message: 'Negócio não encontrado' } };
    }

    const tempId = `offline-${Date.now()}`;
    const saleNumber = (useStore.getState().sales.length || 0) + 1;

    const transformedSale: Sale = {
      id: tempId,
      saleNumber,
      items: sale.items,
      total: sale.total,
      paymentDetails: sale.paymentDetails || {},
      tableId: sale.tableId,
      table_number: sale.table_number,
      table_name: sale.table_name,
      table_customer_name: sale.table_customer_name,
      customerId: sale.customerId,
      createdAt: new Date(),
    };

    enqueuePendingSale(currentBusiness.id, {
      id: tempId,
      businessId: currentBusiness.id,
      saleNumber,
      items: sale.items,
      total: sale.total,
      paymentDetails: sale.paymentDetails || {},
      tableId: sale.tableId,
      table_number: sale.table_number,
      table_name: sale.table_name,
      table_customer_name: sale.table_customer_name,
      customerId: sale.customerId,
      queuedAt: new Date().toISOString(),
    });

    useStore.getState().addSale(transformedSale);
    applyLocalStockDeduction(sale);

    toast({
      title: 'Venda guardada offline',
      description: `Será sincronizada quando houver ligação (nº ${saleNumber})`,
    });

    return { data: transformedSale, error: null };
  };

  // Carregar dados iniciais com retry
  useEffect(() => {
    if (!currentBusiness?.id) {
      setLoading(false);
      setError(null);
      return;
    }

    const loadData = async (attempt = 0) => {
      try {
        setLoading(true);
        setError(null);

        // Modo offline: sem rede, semeia a partir da cache local
        if (!getOnline()) {
          const seeded = seedFromCache(currentBusiness.id);
          setLoading(false);
          if (seeded) return;
        }

        const [productsRes, ingredientsRes, salesRes, creditsRes] = await Promise.all([
            supabase.from('products').select('*').eq('business_id', currentBusiness.id),
            supabase.from('ingredients').select('*').eq('business_id', currentBusiness.id),
            supabase.from('sales').select('*').eq('business_id', currentBusiness.id).order('created_at', { ascending: false }).limit(2000),
            supabase.from('credits').select('*').eq('business_id', currentBusiness.id).order('created_at', { ascending: false }),
          ]);

          const productsData = productsRes.data;
          const ingredientsData = ingredientsRes.data;
          const salesData = salesRes.data;
          const creditsData = creditsRes.data;

        // Atualizar estado com dados carregados
        if (productsData) {
          useStore.getState().setProducts(productsData.map(p => toCamelCase(p) as Product));
        }
        if (ingredientsData) {
          useStore.getState().setIngredients(ingredientsData.map(i => toCamelCase(i) as Ingredient));
        }
        
        // Transformar dados do Supabase para o formato esperado
        if (salesData) {
          const transformedSales = salesData.map(sale => {
            const c = toCamelCase(sale);
            return {
              ...c,
              paymentDetails: sale.payment_details || {},
              createdAt: sale.created_at,
            } as unknown as Sale;
          });
          useStore.getState().setSales(transformedSales);
        }

        // Transformar créditos
        if (creditsData) {
          const transformedCredits: Credit[] = creditsData.map(credit => ({
            id: credit.id,
            customerName: credit.customer_name,
            customerPhone: credit.customer_phone,
            items: credit.items,
            total: credit.total,
            amountPaid: credit.amount_paid || 0,
            remainingBalance: credit.remaining_balance,
            status: credit.status,
            createdAt: credit.created_at,
            updatedAt: credit.updated_at,
            lastPaymentAt: credit.last_payment_at,
            notes: credit.notes,
            saleId: credit.sale_id
          }));
          useStore.getState().setCredits(transformedCredits);
        }

        // Guardar snapshot local (oferece dados quando offline)
        writeCache(currentBusiness.id, 'products', productsRes.data || []);
        writeCache(currentBusiness.id, 'ingredients', ingredientsRes.data || []);
        writeCache(currentBusiness.id, 'sales', salesRes.data || []);
        writeCache(currentBusiness.id, 'credits', creditsRes.data || []);

        // Se chegou aqui, funcionou
        setLoading(false);
        setRetryCount(0);

      } catch (err: unknown) {
        console.error(`Erro ao carregar dados (tentativa ${attempt + 1}/${maxRetries}):`, err);
        
        // Retry automático
        if (attempt < maxRetries - 1) {
          setRetryCount(attempt + 1);
          setTimeout(() => loadData(attempt + 1), 2000 * (attempt + 1)); // Backoff exponencial
        } else {
          // Falhou por rede: tentar ultima snapshot local
          const seeded = seedFromCache(currentBusiness.id);
          if (seeded) {
            setLoading(false);
            setError(null);
            return;
          }
          handleError(err, 'LOAD_DATA');
          setLoading(false);
        }
      }
    };

    loadData();
  }, [currentBusiness?.id]);

  // PRODUTOS
  const addProduct = async (product: Omit<Product, 'id'> & { id?: string }) => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado');
      }

      const { data, error } = await supabase
        .from('products')
        .insert([{ 
          ...toSnakeCase(product as Record<string, any>),
          business_id: currentBusiness.id 
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        useStore.getState().addProduct(toCamelCase(data) as Product);
        toast({
          title: 'Produto criado',
          description: `${product.name} foi adicionado com sucesso`,
        });
        auditLog('create', 'products', data.id, { name: product.name });
      }
      return { data, error: null };
    } catch (err: unknown) {
      return handleError(err, 'ADD_PRODUCT');
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado');
      }
      if (!id) throw new Error('ID do produto é obrigatório');

      const { id: _unused, ...cleanUpdates } = updates;
      const { data, error } = await supabase
        .from('products')
        .update(toSnakeCase(cleanUpdates as Record<string, any>))
        .eq('id', id)
        .eq('business_id', currentBusiness.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        useStore.getState().updateProduct(id, toCamelCase(data) as Partial<Product>);
        toast({
          title: 'Produto atualizado',
          description: 'Alterações salvas com sucesso',
        });
        auditLog('update', 'products', id);
      }
      return { data, error: null };
    } catch (err: unknown) {
      return handleError(err, 'UPDATE_PRODUCT');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado');
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('business_id', currentBusiness.id);

      if (error) throw error;

      useStore.getState().deleteProduct(id);
      toast({
        title: 'Produto removido',
        description: 'Produto foi deletado com sucesso',
      });
      auditLog('delete', 'products', id);
      return { error: null };
    } catch (err: unknown) {
      return handleError(err, 'DELETE_PRODUCT');
    }
  };

  // INGREDIENTES
  const addIngredient = async (ingredient: Omit<Ingredient, 'id'>) => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado');
      }

      const { data, error } = await supabase
        .from('ingredients')
        .insert([{ ...toSnakeCase(ingredient as Record<string, any>) }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        useStore.getState().addIngredient(toCamelCase(data) as Ingredient);
        toast({
          title: 'Ingrediente criado',
          description: `${ingredient.name} foi adicionado com sucesso`,
        });
        auditLog('create', 'ingredients', data.id, { name: ingredient.name });
      }
      return { data, error: null };
    } catch (err: unknown) {
      return handleError(err, 'ADD_INGREDIENT');
    }
  };

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado');
      }

      const { data, error } = await supabase
        .from('ingredients')
        .update(toSnakeCase(updates as Record<string, any>))
        .eq('id', id)
        .eq('business_id', currentBusiness.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        useStore.getState().updateIngredient(id, toCamelCase(data) as Partial<Ingredient>);
        auditLog('update', 'ingredients', id);
      }
      return { data, error: null };
    } catch (err: unknown) {
      return handleError(err, 'UPDATE_INGREDIENT');
    }
  };

  const deleteIngredient = async (id: string) => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado');
      }

      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id)
        .eq('business_id', currentBusiness.id);

      if (error) throw error;

      useStore.getState().deleteIngredient(id);
      toast({
        title: 'Ingrediente removido',
      });
      auditLog('delete', 'ingredients', id);
      return { error: null };
    } catch (err: unknown) {
      return handleError(err, 'DELETE_INGREDIENT');
    }
  };

  // VENDAS
  const addSale = async (sale: Omit<Sale, 'id'>) => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado. Faça login novamente.');
      }

      // Sem ligação → guarda localmente e agenda sincronização
      if (!getOnline()) {
        return saveSaleOffline(sale);
      }
      
      console.log('[ADD_SALE] Iniciando inserção com dados:', {
        business_id: currentBusiness.id,
        items: sale.items,
        total: sale.total
      });

      // Calcular próximo número de venda
      const { count } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', currentBusiness.id);

      const nextSaleNumber = (count || 0) + 1;

      const { data, error } = await supabase
        .from('sales')
        .insert({
          business_id: currentBusiness.id,
          sale_number: nextSaleNumber,
          items: sale.items,
          total: sale.total,
          payment_details: sale.paymentDetails || {},
          table_id: sale.tableId || null,
          table_number: sale.table_number || null,
          table_name: sale.table_name || null,
          table_customer_name: sale.table_customer_name || null,
          customer_id: sale.customerId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[ADD_SALE] Erro na inserção:', error);
        if (isNetworkError(error.message)) {
          return saveSaleOffline(sale);
        }
        throw error;
      }

      console.log('[ADD_SALE] Venda inserida com sucesso:', data);
        
      const transformedSale: Sale = {
        id: data.id,
        saleNumber: data.sale_number,
        items: data.items,
        total: data.total,
        paymentDetails: data.payment_details || {},
        tableId: data.table_id,
        table_number: data.table_number,
        table_name: data.table_name,
        table_customer_name: data.table_customer_name,
        customerId: data.customer_id,
        createdAt: data.created_at,
      };
      
      useStore.getState().addSale(transformedSale);
      auditLog('sale', 'sales', data.id, { total: sale.total, paymentMethod: sale.paymentDetails?.method });

      // Atualizar stock localmente
      applyLocalStockDeduction(sale);

      return { data: transformedSale, error: null };
    } catch (err: unknown) {
      return handleError(err, 'ADD_SALE');
    }
  };

  // CRÉDITOS/DÍVIDAS
  const addCredit = async (credit: Omit<Credit, 'id' | 'createdAt' | 'updatedAt' | 'amountPaid' | 'remainingBalance'>) => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado. Faça login novamente.');
      }

      const { data, error } = await supabase
        .from('credits')
        .insert({
          business_id: currentBusiness.id,
          customer_name: credit.customerName,
          customer_phone: credit.customerPhone,
          items: credit.items,
          total: credit.total,
          amount_paid: 0,
          remaining_balance: credit.total,
          status: credit.status || 'pending',
          notes: credit.notes,
          sale_id: credit.saleId
        })
        .select()
        .single();

      if (error) throw error;

      const transformedCredit: Credit = {
        id: data.id,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        items: data.items,
        total: data.total,
        amountPaid: data.amount_paid || 0,
        remainingBalance: data.remaining_balance,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastPaymentAt: data.last_payment_at,
        notes: data.notes,
        saleId: data.sale_id
      };

      useStore.getState().setCredits([transformedCredit, ...useStore.getState().credits]);

      toast({
        title: 'Crédito registrado',
        description: `Venda a crédito para ${credit.customerName} foi salva com sucesso`,
      });

      auditLog('create', 'credits', data.id, { customerName: credit.customerName, total: credit.total });

      return { data: transformedCredit, error: null };
    } catch (err: unknown) {
      return handleError(err, 'ADD_CREDIT');
    }
  };

  const payCredit = async (creditId: string, amount: number, paymentMethod: 'cash' | 'mpesa' | 'emola' | 'card') => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado. Faça login novamente.');
      }

      // Buscar estado atual do crédito
      const { data: currentCredit, error: fetchError } = await supabase
        .from('credits')
        .select('amount_paid, remaining_balance, total')
        .eq('id', creditId)
        .single();

      if (fetchError) throw fetchError;

      const newAmountPaid = (currentCredit.amount_paid || 0) + amount;
      const newRemainingBalance = Math.max(0, (currentCredit.remaining_balance || 0) - amount);
      const newStatus = newRemainingBalance <= 0 ? 'paid' : 'partial';
      const now = new Date().toISOString();

      // Atualizar crédito com novos valores
      const { error: updateError } = await supabase
        .from('credits')
        .update({
          amount_paid: newAmountPaid,
          remaining_balance: newRemainingBalance,
          status: newStatus,
          updated_at: now,
          last_payment_at: now
        })
        .eq('id', creditId);

      if (updateError) throw updateError;

      // Registrar pagamento
      const { error: paymentError } = await supabase
        .from('credit_payments')
        .insert({
          credit_id: creditId,
          business_id: currentBusiness.id,
          amount,
          payment_method: paymentMethod
        });

      if (paymentError) throw paymentError;

      // Carregar crédito atualizado
      const { data: updatedCreditData, error: creditError } = await supabase
        .from('credits')
        .select('*')
        .eq('id', creditId)
        .single();

      if (creditError) throw creditError;

      const transformedCredit: Credit = {
        id: updatedCreditData.id,
        customerName: updatedCreditData.customer_name,
        customerPhone: updatedCreditData.customer_phone,
        items: updatedCreditData.items,
        total: updatedCreditData.total,
        amountPaid: updatedCreditData.amount_paid || 0,
        remainingBalance: updatedCreditData.remaining_balance,
        status: updatedCreditData.status,
        createdAt: updatedCreditData.created_at,
        updatedAt: updatedCreditData.updated_at,
        lastPaymentAt: updatedCreditData.last_payment_at,
        notes: updatedCreditData.notes,
        saleId: updatedCreditData.sale_id
      };

      // Atualizar na lista local
      useStore.getState().setCredits(
        useStore.getState().credits.map(c => c.id === creditId ? transformedCredit : c)
      );

      toast({
        title: 'Pagamento registrado',
        description: `Pagamento de ${amount.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })} foi registrado`,
      });

      auditLog('payment', 'credits', creditId, { amount, paymentMethod });

      return { data: transformedCredit, error: null };
    } catch (err: unknown) {
      return handleError(err, 'PAY_CREDIT');
    }
  };

  const loadCredits = useCallback(async () => {
    try {
      if (!currentBusiness?.id) return;

      const { data, error } = await supabase
        .from('credits')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedCredits: Credit[] = (data || []).map(credit => ({
        id: credit.id,
        customerName: credit.customer_name,
        customerPhone: credit.customer_phone,
        items: credit.items,
        total: credit.total,
        amountPaid: credit.amount_paid || 0,
        remainingBalance: credit.remaining_balance,
        status: credit.status,
        createdAt: credit.created_at,
        updatedAt: credit.updated_at,
        lastPaymentAt: credit.last_payment_at,
        notes: credit.notes,
        saleId: credit.sale_id
      }));

      useStore.getState().setCredits(transformedCredits);
    } catch (err: unknown) {
      handleError(err, 'LOAD_CREDITS');
    }
  }, [currentBusiness?.id, handleError]);

  const deleteCredit = async (id: string) => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado. Faça login novamente.');
      }

      const { error } = await supabase
        .from('credits')
        .delete()
        .eq('id', id)
        .eq('business_id', currentBusiness.id);

      if (error) throw error;

      useStore.getState().setCredits(useStore.getState().credits.filter(c => c.id !== id));

      toast({
        title: 'Crédito removido',
        description: 'O crédito foi removido com sucesso',
      });

      auditLog('delete', 'credits', id);

      return { error: null };
    } catch (err: unknown) {
      return handleError(err, 'DELETE_CREDIT');
    }
  };

  // Custo real por unidade: prato = soma da ficha técnica; bebida dose = costPrice / doses
  const computeRealUnitCost = useCallback((product: Product): number => {
    if (product.type === 'meal' && product.recipe && product.recipe.length > 0) {
      const recipeCost = product.recipe.reduce((sum, item) => {
        const ingredient = ingredients.find(i => i.id === item.ingredientId);
        return sum + (ingredient ? (ingredient.costPerUnit || 0) * item.quantity : 0);
      }, 0);
      if (recipeCost > 0) return recipeCost;
      return product.costPrice ?? product.estimatedCost ?? 0;
    }
    if (product.type === 'drink' && product.fracionavel && product.dosesPorGarrafa && product.dosesPorGarrafa > 0) {
      return (product.costPrice ?? 0) / product.dosesPorGarrafa;
    }
    return product.costPrice ?? product.estimatedCost ?? 0;
  }, [ingredients]);

  // Calcular vendas por produto
  const salesByProduct = useMemo(() => {
    const salesMap: Record<string, { totalSales: number; totalRevenue: number }> = {};

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = item.productId;
        const quantity = item.quantity;
        const subtotal = item.subtotal;

        if (!salesMap[productId]) {
          salesMap[productId] = { totalSales: 0, totalRevenue: 0 };
        }

        salesMap[productId].totalSales += quantity;
        salesMap[productId].totalRevenue += subtotal;
      });
    });

    return salesMap;
  }, [sales]);

  const stockByMeal = useMemo(() => {
    const stockMap: Record<string, number> = {};

    products.forEach(product => {
      if (product.type === 'meal' && product.recipe && Array.isArray(product.recipe)) {
        const ingredientStocks = product.recipe.map(recipeItem => {
          const ingredientData = ingredients.find(i => i.id === recipeItem.ingredientId);
          if (!ingredientData) return 0;
          return Math.floor(ingredientData.stock / recipeItem.quantity);
        });

        if (ingredientStocks.length > 0) {
          stockMap[product.id] = Math.min(...ingredientStocks);
        }
      }
    });

    return stockMap;
  }, [products, ingredients]);

  // Lucro e margem por produto (custo real descontado das vendas)
  const profitByProduct = useMemo(() => {
    const map: Record<string, {
      totalSales: number;
      totalRevenue: number;
      realUnitCost: number;
      totalCost: number;
      grossProfit: number;
      marginPct: number;
      foodCostPct: number;
    }> = {};

    products.forEach(product => {
      const unitCost = computeRealUnitCost(product);
      const sale = salesByProduct[product.id] || { totalSales: 0, totalRevenue: 0 };
      const { totalSales, totalRevenue } = sale;
      const totalCost = unitCost * totalSales;
      const grossProfit = totalRevenue - totalCost;
      map[product.id] = {
        totalSales,
        totalRevenue,
        realUnitCost: unitCost,
        totalCost,
        grossProfit,
        marginPct: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        foodCostPct: totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0,
      };
    });

    return map;
  }, [products, salesByProduct, computeRealUnitCost]);

  // PREVISÃO DE STOCK (últimos 30 dias)
  const FORECAST_DAYS = 30;
  const forecastCutoff = Date.now() - FORECAST_DAYS * 24 * 60 * 60 * 1000;

  // Consumo médio diário por produto (garrafas/doses/cigarros/unidades)
  const productForecast = useMemo(() => {
    const consumed: Record<string, number> = {};

    sales.forEach(sale => {
      const ts = new Date(sale.createdAt).getTime();
      if (Number.isNaN(ts) || ts < forecastCutoff) return;
      sale.items.forEach(item => {
        consumed[item.productId] = (consumed[item.productId] || 0) + item.quantity;
      });
    });

    const map: Record<string, {
      avgDailyQty: number;
      daysUntilEmpty: number | null;
      needsRestock: boolean;
      suggestedRestockQty: number;
      dailyConsumption: number;
    }> = {};

    products.forEach(product => {
      const totalConsumed = consumed[product.id] || 0;
      const avgDailyQty = totalConsumed / FORECAST_DAYS;
      const stock = product.stock ?? 0;

      let daysUntilEmpty: number | null = null;
      if (avgDailyQty > 0) {
        daysUntilEmpty = stock <= 0 ? 0 : Math.floor(stock / avgDailyQty);
      } else if (stock > 0) {
        daysUntilEmpty = null; // sem vendas, não se esgota pelos dados
      }

      const needsRestock = stock <= 0 || (daysUntilEmpty !== null && daysUntilEmpty < 7);
      const suggestedRestockQty = avgDailyQty > 0 ? Math.max(0, Math.ceil(avgDailyQty * 7) - stock) : 0;

      map[product.id] = {
        avgDailyQty,
        daysUntilEmpty,
        needsRestock,
        suggestedRestockQty,
        dailyConsumption: totalConsumed,
      };
    });

    return map;
  }, [sales, products]);

  // Consumo médio diário por ingrediente (via fichas técnicas das refeições vendidas)
  const ingredientForecast = useMemo(() => {
    const consumed: Record<string, number> = {};

    sales.forEach(sale => {
      const ts = new Date(sale.createdAt).getTime();
      if (Number.isNaN(ts) || ts < forecastCutoff) return;
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product?.recipe || !Array.isArray(product.recipe)) return;
        product.recipe.forEach(recipeItem => {
          consumed[recipeItem.ingredientId] = (consumed[recipeItem.ingredientId] || 0) + recipeItem.quantity * item.quantity;
        });
      });
    });

    const map: Record<string, {
      avgDailyQty: number;
      daysUntilEmpty: number | null;
      needsRestock: boolean;
      suggestedRestockQty: number;
      dailyConsumption: number;
    }> = {};

    ingredients.forEach(ingredient => {
      const totalConsumed = consumed[ingredient.id] || 0;
      const avgDailyQty = totalConsumed / FORECAST_DAYS;
      const stock = ingredient.stock ?? 0;
      const belowMin = stock <= ingredient.minStock;

      let daysUntilEmpty: number | null = null;
      if (avgDailyQty > 0) {
        daysUntilEmpty = stock <= 0 ? 0 : Math.floor(stock / avgDailyQty);
      } else if (stock > 0) {
        daysUntilEmpty = null;
      }

      const needsRestock = stock <= 0 || belowMin || (daysUntilEmpty !== null && daysUntilEmpty < 7);
      const suggestedRestockQty = avgDailyQty > 0
        ? Math.max(ingredient.minStock, Math.ceil(avgDailyQty * 7)) - stock
        : Math.max(0, ingredient.minStock - stock);

      map[ingredient.id] = {
        avgDailyQty,
        daysUntilEmpty,
        needsRestock,
        suggestedRestockQty,
        dailyConsumption: totalConsumed,
      };
    });

    return map;
  }, [sales, products, ingredients]);

  // Função para carregar todas as vendas (sem filtro de data)
  const loadAllSales = useCallback(async () => {
    try {
      if (!currentBusiness?.id) {
        throw new Error('Negócio não encontrado');
      }

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false })
        .limit(2000); // Limite maior para histórico completo

      if (salesError) throw salesError;

      if (salesData) {
        const transformedSales = salesData.map(sale => {
          const c = toCamelCase(sale);
          return {
            ...c,
            paymentDetails: sale.payment_details || {},
            createdAt: sale.created_at,
          } as unknown as Sale;
        });
        useStore.getState().setSales(transformedSales);
      }
      
      return { data: salesData, error: null };
    } catch (err: unknown) {
      return handleError(err, 'LOAD_ALL_SALES');
    }
  }, [currentBusiness?.id, handleError]);

  return {
    loading,
    error,
    retryCount,
    products,
    ingredients,
    sales,
    credits,
    salesByProduct,
    stockByMeal,
    profitByProduct,
    productForecast,
    ingredientForecast,
    addProduct,
    updateProduct,
    deleteProduct,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    addSale,
    loadAllSales,
    addCredit,
    payCredit,
    loadCredits,
    deleteCredit,
  };
}
