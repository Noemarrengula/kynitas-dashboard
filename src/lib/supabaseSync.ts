import { supabase, isSupabaseConfigured } from './supabase';
import { Ingredient, Sale, StockMovement } from '@/types';

// Sincronizar ingredientes
export const syncIngredients = async (ingredients: Ingredient[]) => {
  if (!isSupabaseConfigured()) return;
  
  try {
    const { error } = await supabase
      .from('ingredients')
      .upsert(ingredients.map(i => ({
        id: i.id,
        name: i.name,
        stock: i.stock,
        unit: i.unit,
        min_stock: i.minStock,
        cost_per_unit: i.costPerUnit,
        packages: i.packages,
        updated_at: new Date().toISOString(),
      })));
    
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao sincronizar ingredientes:', error);
  }
};

// Carregar ingredientes
export const loadIngredients = async (): Promise<Ingredient[]> => {
  if (!isSupabaseConfigured()) return [];
  
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return (data || []).map(i => ({
      id: i.id,
      name: i.name,
      stock: i.stock,
      unit: i.unit,
      minStock: i.min_stock,
      costPerUnit: i.cost_per_unit,
      packages: i.packages,
    }));
  } catch (error) {
    console.error('Erro ao carregar ingredientes:', error);
    return [];
  }
};

// Salvar venda
export const saveSale = async (sale: Sale) => {
  if (!isSupabaseConfigured()) return;
  
  try {
    const { error } = await supabase
      .from('sales')
      .insert({
        id: sale.id,
        items: sale.items,
        total: sale.total,
        payment_details: sale.paymentDetails,
        table_id: sale.tableId,
        table_number: sale.table_number || null,
        table_name: sale.table_name || null,
        table_customer_name: sale.table_customer_name || null,
        created_at: sale.createdAt.toISOString(),
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao salvar venda:', error);
    throw error;
  }
};

// Carregar vendas
export const loadSales = async (): Promise<Sale[]> => {
  if (!isSupabaseConfigured()) return [];
  
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(s => ({
      id: s.id,
      items: s.items,
      total: s.total,
      paymentDetails: s.payment_details,
      tableId: s.table_id,
      table_number: s.table_number,
      table_name: s.table_name,
      table_customer_name: s.table_customer_name,
      createdAt: new Date(s.created_at),
    }));
  } catch (error) {
    console.error('Erro ao carregar vendas:', error);
    return [];
  }
};

// Salvar movimentação
export const saveStockMovement = async (movement: StockMovement) => {
  if (!isSupabaseConfigured()) return;
  
  try {
    const { error } = await supabase
      .from('stock_movements')
      .insert({
        id: movement.id,
        ingredient_id: movement.ingredientId,
        product_id: movement.productId,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        created_at: movement.createdAt.toISOString(),
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao salvar movimentação:', error);
  }
};
