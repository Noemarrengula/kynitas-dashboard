import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/hooks/use-toast';
import { Product, Ingredient, Sale, Credit } from '@/types';

interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DatabaseError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Função auxiliar para tratamento de erros
  const handleError = (err: unknown, operation: string) => {
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
        if (productsData) setProducts(productsData.map(p => toCamelCase(p) as Product));
        if (ingredientsData) setIngredients(ingredientsData.map(i => toCamelCase(i) as Ingredient));
        
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
          setSales(transformedSales);
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
          setCredits(transformedCredits);
        }

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
        setProducts([...products, toCamelCase(data) as Product]);
        toast({
          title: 'Produto criado',
          description: `${product.name} foi adicionado com sucesso`,
        });
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
        setProducts(products.map(p => p.id === id ? toCamelCase(data) as Product : p));
        toast({
          title: 'Produto atualizado',
          description: 'Alterações salvas com sucesso',
        });
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

      setProducts(products.filter(p => p.id !== id));
      toast({
        title: 'Produto removido',
        description: 'Produto foi deletado com sucesso',
      });
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
        setIngredients([...ingredients, toCamelCase(data) as Ingredient]);
        toast({
          title: 'Ingrediente criado',
          description: `${ingredient.name} foi adicionado com sucesso`,
        });
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
        setIngredients(ingredients.map(i => i.id === id ? toCamelCase(data) as Ingredient : i));
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

      setIngredients(ingredients.filter(i => i.id !== id));
      toast({
        title: 'Ingrediente removido',
      });
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
        })
        .select()
        .single();

      if (error) {
        console.error('[ADD_SALE] Erro na inserção:', error);
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
        createdAt: data.created_at,
      };
      
      setSales([transformedSale, ...sales]);
      
      // Atualizar stock localmente
      const updatedProducts = products.map(product => {
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
      setProducts(updatedProducts);

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

      setCredits([transformedCredit, ...credits]);

      toast({
        title: 'Crédito registrado',
        description: `Venda a crédito para ${credit.customerName} foi salva com sucesso`,
      });

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
      setCredits(credits.map(c => c.id === creditId ? transformedCredit : c));

      toast({
        title: 'Pagamento registrado',
        description: `Pagamento de ${amount.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })} foi registrado`,
      });

      return { data: transformedCredit, error: null };
    } catch (err: unknown) {
      return handleError(err, 'PAY_CREDIT');
    }
  };

  const loadCredits = async () => {
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

      setCredits(transformedCredits);
    } catch (err: unknown) {
      handleError(err, 'LOAD_CREDITS');
    }
  };

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

      setCredits(credits.filter(c => c.id !== id));

      toast({
        title: 'Crédito removido',
        description: 'O crédito foi removido com sucesso',
      });

      return { error: null };
    } catch (err: unknown) {
      return handleError(err, 'DELETE_CREDIT');
    }
  };

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

  // Função para carregar todas as vendas (sem filtro de data)
  const loadAllSales = async () => {
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
        setSales(transformedSales);
      }
      
      return { data: salesData, error: null };
    } catch (err: unknown) {
      return handleError(err, 'LOAD_ALL_SALES');
    }
  };

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
