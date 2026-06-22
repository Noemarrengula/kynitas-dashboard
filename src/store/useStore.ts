import { create } from 'zustand';
import { Product, Table, Order, Sale, StockMovement, User, Ingredient } from '@/types';

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Products
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Ingredients
  ingredients: Ingredient[];
  setIngredients: (ingredients: Ingredient[]) => void;
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => void;
  
  // Tables
  tables: Table[];
  setTables: (tables: Table[]) => void;
  addTable: (table: Table) => void;
  updateTable: (id: string, table: Partial<Table>) => void;
  
  // Orders
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  
  // Sales
  sales: Sale[];
  setSales: (sales: Sale[]) => void;
  addSale: (sale: Sale) => void;
  clearSales: () => void;
  
  // Stock movements
  stockMovements: StockMovement[];
  addStockMovement: (movement: StockMovement) => void;
  
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),
  
  // Products
  products: [],
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  updateProduct: (id, updatedProduct) => set((state) => ({
    products: state.products.map((p) => p.id === id ? { ...p, ...updatedProduct } : p),
  })),
  deleteProduct: (id) => set((state) => ({
    products: state.products.filter((p) => p.id !== id),
  })),
  
  // Tables
  tables: [],
  setTables: (tables) => set({ tables }),
  addTable: (table) => set((state) => ({ tables: [...state.tables, table] })),
  updateTable: (id, updatedTable) => set((state) => ({
    tables: state.tables.map((t) => t.id === id ? { ...t, ...updatedTable } : t),
  })),
  
  // Orders
  orders: [],
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
  updateOrder: (id, updatedOrder) => set((state) => ({
    orders: state.orders.map((o) => o.id === id ? { ...o, ...updatedOrder } : o),
  })),
  
  // Sales
  sales: [],
  setSales: (sales) => set({ sales }),
  clearSales: () => set({ sales: [] }),
  addSale: (sale) => set((state) => ({
    sales: [...state.sales, sale],
  })),
  
  // Stock movements
  stockMovements: [],
  addStockMovement: (movement) => set((state) => ({
    stockMovements: [...state.stockMovements, movement],
  })),
  
  // Ingredients
  ingredients: [],
  setIngredients: (ingredients) => set({ ingredients }),
  addIngredient: (ingredient) => set((state) => ({ ingredients: [...state.ingredients, ingredient] })),
  updateIngredient: (id, updatedIngredient) => set((state) => ({
    ingredients: state.ingredients.map((i) => i.id === id ? { ...i, ...updatedIngredient } : i),
  })),
  deleteIngredient: (id) => set((state) => ({
    ingredients: state.ingredients.filter((i) => i.id !== id),
  })),
  
  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
