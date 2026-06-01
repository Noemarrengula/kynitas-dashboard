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

// Mock data - BEBIDAS REAIS
const mockIngredientsDrinks: Ingredient[] = [
  { id: 'ing-d1', name: 'Heineken Txoti (Pequena)', stock: 0, unit: 'un', minStock: 24, costPerUnit: 75, packages: [{ id: 'pkg-1', name: 'Caixa 24un', quantity: 24, costPerPackage: 1800 }, { id: 'pkg-1u', name: 'Unidade', quantity: 1, costPerPackage: 75 }] },
  { id: 'ing-d2', name: 'Heineken Lata', stock: 0, unit: 'un', minStock: 24, costPerUnit: 70, packages: [{ id: 'pkg-2', name: 'Caixa 24un', quantity: 24, costPerPackage: 1680 }, { id: 'pkg-2u', name: 'Unidade', quantity: 1, costPerPackage: 70 }] },
  { id: 'ing-d3', name: 'Heineken Grande', stock: 0, unit: 'un', minStock: 20, costPerUnit: 70, packages: [{ id: 'pkg-3', name: 'Caixa 20un', quantity: 20, costPerPackage: 1400 }, { id: 'pkg-3u', name: 'Unidade', quantity: 1, costPerPackage: 70 }] },
  { id: 'ing-d4', name: '2M Gongondza (Grande)', stock: 0, unit: 'un', minStock: 12, costPerUnit: 60, packages: [{ id: 'pkg-4', name: 'Caixa 12un', quantity: 12, costPerPackage: 720 }, { id: 'pkg-4u', name: 'Unidade', quantity: 1, costPerPackage: 60 }] },
  { id: 'ing-d5', name: '2M Lata', stock: 0, unit: 'un', minStock: 24, costPerUnit: 55, packages: [{ id: 'pkg-5', name: 'Caixa 24un', quantity: 24, costPerPackage: 1320 }, { id: 'pkg-5u', name: 'Unidade', quantity: 1, costPerPackage: 55 }] },
  { id: 'ing-d6', name: '2M Txoti (Pequena)', stock: 0, unit: 'un', minStock: 24, costPerUnit: 45, packages: [{ id: 'pkg-6', name: 'Caixa 24un', quantity: 24, costPerPackage: 1080 }, { id: 'pkg-6u', name: 'Unidade', quantity: 1, costPerPackage: 45 }] },
  { id: 'ing-d7', name: 'Impala de Milho Grande', stock: 0, unit: 'un', minStock: 12, costPerUnit: 50, packages: [{ id: 'pkg-7', name: 'Caixa 12un', quantity: 12, costPerPackage: 600 }, { id: 'pkg-7u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  { id: 'ing-d8', name: 'Impala de Milho Lata', stock: 0, unit: 'un', minStock: 24, costPerUnit: 50, packages: [{ id: 'pkg-8', name: 'Caixa 24un', quantity: 24, costPerPackage: 1200 }, { id: 'pkg-8u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  { id: 'ing-d9', name: 'Impala de Milho Txoti (Pequena)', stock: 0, unit: 'un', minStock: 24, costPerUnit: 40, packages: [{ id: 'pkg-9', name: 'Caixa 24un', quantity: 24, costPerPackage: 960 }, { id: 'pkg-9u', name: 'Unidade', quantity: 1, costPerPackage: 40 }] },
  { id: 'ing-d10', name: 'Laurentina Preta Grande', stock: 0, unit: 'un', minStock: 12, costPerUnit: 65, packages: [{ id: 'pkg-10', name: 'Caixa 12un', quantity: 12, costPerPackage: 780 }, { id: 'pkg-10u', name: 'Unidade', quantity: 1, costPerPackage: 65 }] },
  { id: 'ing-d11', name: 'Laurentina Preta Txoti (Pequena)', stock: 0, unit: 'un', minStock: 24, costPerUnit: 50, packages: [{ id: 'pkg-11', name: 'Caixa 24un', quantity: 24, costPerPackage: 1200 }, { id: 'pkg-11u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  { id: 'ing-d12', name: 'Manica Grande', stock: 0, unit: 'un', minStock: 12, costPerUnit: 60, packages: [{ id: 'pkg-12', name: 'Caixa 12un', quantity: 12, costPerPackage: 720 }, { id: 'pkg-12u', name: 'Unidade', quantity: 1, costPerPackage: 60 }] },
  { id: 'ing-d13', name: 'Manica Lata', stock: 0, unit: 'un', minStock: 24, costPerUnit: 55, packages: [{ id: 'pkg-13', name: 'Caixa 24un', quantity: 24, costPerPackage: 1320 }, { id: 'pkg-13u', name: 'Unidade', quantity: 1, costPerPackage: 55 }] },
  { id: 'ing-d14', name: 'Lite Normal', stock: 0, unit: 'un', minStock: 24, costPerUnit: 60, packages: [{ id: 'pkg-14', name: 'Caixa 24un', quantity: 24, costPerPackage: 1440 }, { id: 'pkg-14u', name: 'Unidade', quantity: 1, costPerPackage: 60 }] },
  { id: 'ing-d15', name: 'Brutal Fruit', stock: 0, unit: 'un', minStock: 24, costPerUnit: 70, packages: [{ id: 'pkg-15', name: 'Caixa 24un', quantity: 24, costPerPackage: 1680 }, { id: 'pkg-15u', name: 'Unidade', quantity: 1, costPerPackage: 70 }] },
  { id: 'ing-d16', name: 'Gold', stock: 0, unit: 'un', minStock: 24, costPerUnit: 65, packages: [{ id: 'pkg-16', name: 'Caixa 24un', quantity: 24, costPerPackage: 1560 }, { id: 'pkg-16u', name: 'Unidade', quantity: 1, costPerPackage: 65 }] },
  { id: 'ing-d17', name: 'Mayfair London Dry Lata', stock: 0, unit: 'un', minStock: 24, costPerUnit: 75, packages: [{ id: 'pkg-17', name: 'Caixa 24un', quantity: 24, costPerPackage: 1800 }, { id: 'pkg-17u', name: 'Unidade', quantity: 1, costPerPackage: 75 }] },
  { id: 'ing-d18', name: 'Txilar Garrafa', stock: 0, unit: 'un', minStock: 12, costPerUnit: 50, packages: [{ id: 'pkg-18', name: 'Caixa 12un', quantity: 12, costPerPackage: 600 }, { id: 'pkg-18u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  { id: 'ing-d19', name: 'Txilar Txoti (Pequena)', stock: 0, unit: 'un', minStock: 24, costPerUnit: 50, packages: [{ id: 'pkg-19', name: 'Caixa 24un', quantity: 24, costPerPackage: 1200 }, { id: 'pkg-19u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  { id: 'ing-d20', name: 'Txilar Lata', stock: 0, unit: 'un', minStock: 24, costPerUnit: 50, packages: [{ id: 'pkg-20', name: 'Caixa 24un', quantity: 24, costPerPackage: 1200 }, { id: 'pkg-20u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  { id: 'ing-d21', name: 'Savana Dry', stock: 0, unit: 'un', minStock: 24, costPerUnit: 75, packages: [{ id: 'pkg-21', name: 'Caixa 24un', quantity: 24, costPerPackage: 1800 }, { id: 'pkg-21u', name: 'Unidade', quantity: 1, costPerPackage: 75 }] },
  { id: 'ing-d22', name: 'Savana Lemon', stock: 0, unit: 'un', minStock: 24, costPerUnit: 75, packages: [{ id: 'pkg-22', name: 'Caixa 24un', quantity: 24, costPerPackage: 1800 }, { id: 'pkg-22u', name: 'Unidade', quantity: 1, costPerPackage: 75 }] },
  { id: 'ing-d23', name: 'Flying Fish', stock: 0, unit: 'un', minStock: 24, costPerUnit: 70, packages: [{ id: 'pkg-23', name: 'Caixa 24un', quantity: 24, costPerPackage: 1680 }, { id: 'pkg-23u', name: 'Unidade', quantity: 1, costPerPackage: 70 }] },
  
  // VINHOS
  { id: 'ing-d24', name: 'Vinho Portada', stock: 0, unit: 'un', minStock: 6, costPerUnit: 550, packages: [{ id: 'pkg-24', name: 'Caixa 6un', quantity: 6, costPerPackage: 3300 }, { id: 'pkg-24u', name: 'Unidade', quantity: 1, costPerPackage: 550 }] },
  { id: 'ing-d25', name: 'Vinho Pé Branco', stock: 0, unit: 'un', minStock: 6, costPerUnit: 500, packages: [{ id: 'pkg-25', name: 'Caixa 6un', quantity: 6, costPerPackage: 3000 }, { id: 'pkg-25u', name: 'Unidade', quantity: 1, costPerPackage: 500 }] },
  { id: 'ing-d26', name: 'Vinho Alandra', stock: 0, unit: 'un', minStock: 6, costPerUnit: 500, packages: [{ id: 'pkg-26', name: 'Caixa 6un', quantity: 6, costPerPackage: 3000 }, { id: 'pkg-26u', name: 'Unidade', quantity: 1, costPerPackage: 500 }] },
  { id: 'ing-d27', name: 'Vinho Casa do Bispo', stock: 0, unit: 'un', minStock: 6, costPerUnit: 550, packages: [{ id: 'pkg-27', name: 'Caixa 6un', quantity: 6, costPerPackage: 3300 }, { id: 'pkg-27u', name: 'Unidade', quantity: 1, costPerPackage: 550 }] },
  { id: 'ing-d28', name: 'Vinho 4th Street', stock: 0, unit: 'un', minStock: 6, costPerUnit: 400, packages: [{ id: 'pkg-28', name: 'Caixa 6un', quantity: 6, costPerPackage: 2400 }, { id: 'pkg-28u', name: 'Unidade', quantity: 1, costPerPackage: 400 }] },
  { id: 'ing-d29', name: 'Vinho Drostdy Hof', stock: 0, unit: 'un', minStock: 6, costPerUnit: 390, packages: [{ id: 'pkg-29', name: 'Caixa 6un', quantity: 6, costPerPackage: 2340 }, { id: 'pkg-29u', name: 'Unidade', quantity: 1, costPerPackage: 390 }] },
  
  // GINS
  { id: 'ing-d30', name: 'Gordon´s London Dry Gin', stock: 0, unit: 'un', minStock: 12, costPerUnit: 450, packages: [{ id: 'pkg-30', name: 'Caixa 12un', quantity: 12, costPerPackage: 5400 }, { id: 'pkg-30u', name: 'Unidade', quantity: 1, costPerPackage: 450 }] },
  { id: 'ing-d31', name: 'Caravela Dry Gin Pequena', stock: 0, unit: 'un', minStock: 16, costPerUnit: 100, packages: [{ id: 'pkg-31', name: 'Caixa 16un', quantity: 16, costPerPackage: 1600 }, { id: 'pkg-31u', name: 'Unidade', quantity: 1, costPerPackage: 100 }] },
  { id: 'ing-d32', name: 'Caravela Dry Gin Grande', stock: 0, unit: 'un', minStock: 6, costPerUnit: 350, packages: [{ id: 'pkg-32', name: 'Caixa 6un', quantity: 6, costPerPackage: 2100 }, { id: 'pkg-32u', name: 'Unidade', quantity: 1, costPerPackage: 350 }] },
  { id: 'ing-d33', name: 'Soldier Pequena', stock: 0, unit: 'un', minStock: 16, costPerUnit: 60, packages: [{ id: 'pkg-33', name: 'Caixa 16un', quantity: 16, costPerPackage: 960 }, { id: 'pkg-33u', name: 'Unidade', quantity: 1, costPerPackage: 60 }] },
  
  // WHISKYS
  { id: 'ing-d34', name: 'Label 9 Horas Pequeno', stock: 0, unit: 'un', minStock: 16, costPerUnit: 65, packages: [{ id: 'pkg-34', name: 'Caixa 16un', quantity: 16, costPerPackage: 1040 }, { id: 'pkg-34u', name: 'Unidade', quantity: 1, costPerPackage: 65 }] },
  { id: 'ing-d35', name: 'Clan Mcgregor', stock: 0, unit: 'un', minStock: 6, costPerUnit: 430, packages: [{ id: 'pkg-35', name: 'Caixa 6un', quantity: 6, costPerPackage: 2580 }, { id: 'pkg-35u', name: 'Unidade', quantity: 1, costPerPackage: 430 }] },
  { id: 'ing-d36', name: 'Tipo Tinto Grande', stock: 0, unit: 'un', minStock: 6, costPerUnit: 350, packages: [{ id: 'pkg-36', name: 'Caixa 6un', quantity: 6, costPerPackage: 2100 }, { id: 'pkg-36u', name: 'Unidade', quantity: 1, costPerPackage: 350 }] },
  { id: 'ing-d37', name: 'Amarula', stock: 0, unit: 'un', minStock: 6, costPerUnit: 720, packages: [{ id: 'pkg-37', name: 'Caixa 6un', quantity: 6, costPerPackage: 4320 }, { id: 'pkg-37u', name: 'Unidade', quantity: 1, costPerPackage: 720 }] },
  
  // REFRIGERANTES
  { id: 'ing-d38', name: 'Refresco Lata', stock: 0, unit: 'un', minStock: 24, costPerUnit: 50, packages: [{ id: 'pkg-38', name: 'Caixa 24un', quantity: 24, costPerPackage: 1200 }, { id: 'pkg-38u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  { id: 'ing-d39', name: 'Refresco Garrafa', stock: 0, unit: 'un', minStock: 24, costPerUnit: 20, packages: [{ id: 'pkg-39', name: 'Caixa 24un', quantity: 24, costPerPackage: 480 }, { id: 'pkg-39u', name: 'Unidade', quantity: 1, costPerPackage: 20 }] },
  { id: 'ing-d40', name: 'Refresco Garrafa Txoti', stock: 0, unit: 'un', minStock: 24, costPerUnit: 25, packages: [{ id: 'pkg-40', name: 'Caixa 24un', quantity: 24, costPerPackage: 600 }, { id: 'pkg-40u', name: 'Unidade', quantity: 1, costPerPackage: 25 }] },
  { id: 'ing-d41', name: 'Refresco 1L', stock: 0, unit: 'un', minStock: 6, costPerUnit: 65, packages: [{ id: 'pkg-41', name: 'Caixa 6un', quantity: 6, costPerPackage: 390 }, { id: 'pkg-41u', name: 'Unidade', quantity: 1, costPerPackage: 65 }] },
  { id: 'ing-d42', name: 'Refresco 2L', stock: 0, unit: 'un', minStock: 6, costPerUnit: 110, packages: [{ id: 'pkg-42', name: 'Caixa 6un', quantity: 6, costPerPackage: 660 }, { id: 'pkg-42u', name: 'Unidade', quantity: 1, costPerPackage: 110 }] },
  { id: 'ing-d43', name: 'Refresco 1.5L', stock: 0, unit: 'un', minStock: 6, costPerUnit: 85, packages: [{ id: 'pkg-43', name: 'Caixa 6un', quantity: 6, costPerPackage: 510 }, { id: 'pkg-43u', name: 'Unidade', quantity: 1, costPerPackage: 85 }] },
  { id: 'ing-d44', name: 'Sumo Cappy Txoti', stock: 0, unit: 'un', minStock: 24, costPerUnit: 35, packages: [{ id: 'pkg-44', name: 'Caixa 24un', quantity: 24, costPerPackage: 840 }, { id: 'pkg-44u', name: 'Unidade', quantity: 1, costPerPackage: 35 }] },
  { id: 'ing-d45', name: 'Sumo Cappy 1L', stock: 0, unit: 'un', minStock: 6, costPerUnit: 70, packages: [{ id: 'pkg-45', name: 'Caixa 6un', quantity: 6, costPerPackage: 420 }, { id: 'pkg-45u', name: 'Unidade', quantity: 1, costPerPackage: 70 }] },
  { id: 'ing-d46', name: 'Sumo Compal 500mL', stock: 0, unit: 'un', minStock: 10, costPerUnit: 70, packages: [{ id: 'pkg-46', name: 'Caixa 10un', quantity: 10, costPerPackage: 700 }, { id: 'pkg-46u', name: 'Unidade', quantity: 1, costPerPackage: 70 }] },
  { id: 'ing-d47', name: 'Sumo Compal 1L', stock: 0, unit: 'un', minStock: 12, costPerUnit: 130, packages: [{ id: 'pkg-47', name: 'Caixa 12un', quantity: 12, costPerPackage: 1560 }, { id: 'pkg-47u', name: 'Unidade', quantity: 1, costPerPackage: 130 }] },
  { id: 'ing-d48', name: 'Sumo Santal 500mL', stock: 0, unit: 'un', minStock: 10, costPerUnit: 70, packages: [{ id: 'pkg-48', name: 'Caixa 10un', quantity: 10, costPerPackage: 700 }, { id: 'pkg-48u', name: 'Unidade', quantity: 1, costPerPackage: 70 }] },
  { id: 'ing-d49', name: 'Fizzy', stock: 0, unit: 'un', minStock: 24, costPerUnit: 20, packages: [{ id: 'pkg-49', name: 'Caixa 24un', quantity: 24, costPerPackage: 480 }, { id: 'pkg-49u', name: 'Unidade', quantity: 1, costPerPackage: 20 }] },
  { id: 'ing-d50', name: 'Sumo Ceres', stock: 0, unit: 'un', minStock: 12, costPerUnit: 130, packages: [{ id: 'pkg-50', name: 'Caixa 12un', quantity: 12, costPerPackage: 1560 }, { id: 'pkg-50u', name: 'Unidade', quantity: 1, costPerPackage: 130 }] },
  { id: 'ing-d51', name: 'Lemon Twist', stock: 0, unit: 'un', minStock: 24, costPerUnit: 50, packages: [{ id: 'pkg-51', name: 'Caixa 24un', quantity: 24, costPerPackage: 1200 }, { id: 'pkg-51u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  { id: 'ing-d52', name: 'Schweppes', stock: 0, unit: 'un', minStock: 24, costPerUnit: 50, packages: [{ id: 'pkg-52', name: 'Caixa 24un', quantity: 24, costPerPackage: 1200 }, { id: 'pkg-52u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  
  // ENERGÉTICOS
  { id: 'ing-d53', name: 'Dragon Lata', stock: 0, unit: 'un', minStock: 24, costPerUnit: 50, packages: [{ id: 'pkg-53', name: 'Caixa 24un', quantity: 24, costPerPackage: 1200 }, { id: 'pkg-53u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  { id: 'ing-d54', name: 'Monster Energy Lata', stock: 0, unit: 'un', minStock: 24, costPerUnit: 85, packages: [{ id: 'pkg-54', name: 'Caixa 24un', quantity: 24, costPerPackage: 2040 }, { id: 'pkg-54u', name: 'Unidade', quantity: 1, costPerPackage: 85 }] },
  { id: 'ing-d55', name: 'Redbull', stock: 0, unit: 'un', minStock: 24, costPerUnit: 100, packages: [{ id: 'pkg-55', name: 'Caixa 24un', quantity: 24, costPerPackage: 2400 }, { id: 'pkg-55u', name: 'Unidade', quantity: 1, costPerPackage: 100 }] },
  { id: 'ing-d56', name: 'Frozzy Energético', stock: 0, unit: 'un', minStock: 24, costPerUnit: 25, packages: [{ id: 'pkg-56', name: 'Caixa 24un', quantity: 24, costPerPackage: 600 }, { id: 'pkg-56u', name: 'Unidade', quantity: 1, costPerPackage: 25 }] },
  
  // ÁGUAS
  { id: 'ing-d57', name: 'Água Pequena Namaacha', stock: 0, unit: 'un', minStock: 24, costPerUnit: 25, packages: [{ id: 'pkg-57', name: 'Caixa 24un', quantity: 24, costPerPackage: 600 }, { id: 'pkg-57u', name: 'Unidade', quantity: 1, costPerPackage: 25 }] },
  { id: 'ing-d58', name: 'Água Grande Namaacha', stock: 0, unit: 'un', minStock: 12, costPerUnit: 50, packages: [{ id: 'pkg-58', name: 'Caixa 12un', quantity: 12, costPerPackage: 600 }, { id: 'pkg-58u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
  
  // BOLACHAS
  { id: 'ing-d59', name: 'Bolacha Maria Pequena', stock: 0, unit: 'un', minStock: 24, costPerUnit: 25, packages: [{ id: 'pkg-59', name: 'Caixa 24un', quantity: 24, costPerPackage: 600 }, { id: 'pkg-59u', name: 'Unidade', quantity: 1, costPerPackage: 25 }] },
  { id: 'ing-d60', name: 'Bolacha Água e Sal Pequena', stock: 0, unit: 'un', minStock: 24, costPerUnit: 25, packages: [{ id: 'pkg-60', name: 'Caixa 24un', quantity: 24, costPerPackage: 600 }, { id: 'pkg-60u', name: 'Unidade', quantity: 1, costPerPackage: 25 }] },
  { id: 'ing-d61', name: 'Bolacha Cocô', stock: 0, unit: 'un', minStock: 24, costPerUnit: 25, packages: [{ id: 'pkg-61', name: 'Caixa 24un', quantity: 24, costPerPackage: 600 }, { id: 'pkg-61u', name: 'Unidade', quantity: 1, costPerPackage: 25 }] },
  { id: 'ing-d62', name: 'Bolacha Pica Pau', stock: 0, unit: 'un', minStock: 48, costPerUnit: 5, packages: [{ id: 'pkg-62', name: 'Caixa 48un', quantity: 48, costPerPackage: 240 }, { id: 'pkg-62u', name: 'Unidade', quantity: 1, costPerPackage: 5 }] },
  { id: 'ing-d63', name: 'Doritos', stock: 0, unit: 'un', minStock: 20, costPerUnit: 100, packages: [{ id: 'pkg-63', name: 'Caixa 20un', quantity: 20, costPerPackage: 2000 }, { id: 'pkg-63u', name: 'Unidade', quantity: 1, costPerPackage: 100 }] },
  
  // CIGARROS
  { id: 'ing-d64', name: 'Cigarro GT', stock: 0, unit: 'un', minStock: 10, costPerUnit: 100, packages: [{ id: 'pkg-64', name: 'Volume 10un', quantity: 10, costPerPackage: 1000 }, { id: 'pkg-64u', name: 'Unidade', quantity: 1, costPerPackage: 100 }] },
  { id: 'ing-d65', name: 'Cigarro Pall Mall Azul', stock: 0, unit: 'un', minStock: 10, costPerUnit: 120, packages: [{ id: 'pkg-65', name: 'Volume 10un', quantity: 10, costPerPackage: 1200 }, { id: 'pkg-65u', name: 'Unidade', quantity: 1, costPerPackage: 120 }] },
  
  // KOMBUCHA
  { id: 'ing-d66', name: 'Kombucha', stock: 0, unit: 'un', minStock: 24, costPerUnit: 50, packages: [{ id: 'pkg-66', name: 'Caixa 24un', quantity: 24, costPerPackage: 1200 }, { id: 'pkg-66u', name: 'Unidade', quantity: 1, costPerPackage: 50 }] },
];

const mockIngredients: Ingredient[] = [];
/*
  ...mockIngredientsDrinks,
  { id: 'ing-m1', name: 'Frango', stock: 0, unit: 'g', minStock: 5000, costPerUnit: 0.15, packages: [{ id: 'pkg-m1', name: 'Kg', quantity: 1000, costPerPackage: 150 }] },
  { id: 'ing-m2', name: 'Arroz', stock: 0, unit: 'g', minStock: 5000, costPerUnit: 0.05, packages: [{ id: 'pkg-m2', name: 'Kg', quantity: 1000, costPerPackage: 50 }] },
  { id: 'ing-m3', name: 'Alface', stock: 0, unit: 'un', minStock: 10, costPerUnit: 20, packages: [{ id: 'pkg-m3', name: 'Unidade', quantity: 1, costPerPackage: 20 }] },
  { id: 'ing-m4', name: 'Batata', stock: 0, unit: 'g', minStock: 5000, costPerUnit: 0.04, packages: [{ id: 'pkg-m4', name: 'Kg', quantity: 1000, costPerPackage: 40 }] },
  { id: 'ing-m5', name: 'Carne de Porco', stock: 0, unit: 'g', minStock: 5000, costPerUnit: 0.65, packages: [{ id: 'pkg-m5', name: 'Kg', quantity: 1000, costPerPackage: 650 }] },
  { id: 'ing-m6', name: 'Carne de Vaca', stock: 0, unit: 'g', minStock: 5000, costPerUnit: 0.3, packages: [{ id: 'pkg-m6', name: 'Kg', quantity: 1000, costPerPackage: 300 }] },
];
*/

const mockProducts: Product[] = [];
/*
  { id: '1', name: 'Heineken Txoti', category: 'Cervejas', price: 75, costPrice: 75, stock: 0, internalId: 'BEB001', type: 'drink', recipe: [{ ingredientId: 'ing-d1', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '2', name: 'Heineken Lata', category: 'Cervejas', price: 70, costPrice: 70, stock: 0, internalId: 'BEB002', type: 'drink', recipe: [{ ingredientId: 'ing-d2', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '3', name: 'Heineken Grande', category: 'Cervejas', price: 70, costPrice: 70, stock: 0, internalId: 'BEB003', type: 'drink', recipe: [{ ingredientId: 'ing-d3', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '4', name: '2M Gongondza', category: 'Cervejas', price: 60, costPrice: 60, stock: 0, internalId: 'BEB004', type: 'drink', recipe: [{ ingredientId: 'ing-d4', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '5', name: '2M Lata', category: 'Cervejas', price: 55, costPrice: 55, stock: 0, internalId: 'BEB005', type: 'drink', recipe: [{ ingredientId: 'ing-d5', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '6', name: '2M Txoti', category: 'Cervejas', price: 45, costPrice: 45, stock: 0, internalId: 'BEB006', type: 'drink', recipe: [{ ingredientId: 'ing-d6', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '7', name: 'Impala Grande', category: 'Cervejas', price: 50, costPrice: 50, stock: 0, internalId: 'BEB007', type: 'drink', recipe: [{ ingredientId: 'ing-d7', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '8', name: 'Impala Lata', category: 'Cervejas', price: 50, costPrice: 50, stock: 0, internalId: 'BEB008', type: 'drink', recipe: [{ ingredientId: 'ing-d8', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '9', name: 'Impala Txoti', category: 'Cervejas', price: 40, costPrice: 40, stock: 0, internalId: 'BEB009', type: 'drink', recipe: [{ ingredientId: 'ing-d9', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '10', name: 'Laurentina Preta Grande', category: 'Cervejas', price: 65, costPrice: 65, stock: 0, internalId: 'BEB010', type: 'drink', recipe: [{ ingredientId: 'ing-d10', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '11', name: 'Laurentina Preta Txoti', category: 'Cervejas', price: 50, costPrice: 50, stock: 0, internalId: 'BEB011', type: 'drink', recipe: [{ ingredientId: 'ing-d11', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '12', name: 'Manica Grande', category: 'Cervejas', price: 60, costPrice: 60, stock: 0, internalId: 'BEB012', type: 'drink', recipe: [{ ingredientId: 'ing-d12', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '13', name: 'Manica Lata', category: 'Cervejas', price: 55, costPrice: 55, stock: 0, internalId: 'BEB013', type: 'drink', recipe: [{ ingredientId: 'ing-d13', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '14', name: 'Lite Normal', category: 'Cervejas', price: 60, costPrice: 60, stock: 0, internalId: 'BEB014', type: 'drink', recipe: [{ ingredientId: 'ing-d14', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '15', name: 'Brutal Fruit', category: 'Coolers', price: 70, costPrice: 70, stock: 0, internalId: 'BEB015', type: 'drink', recipe: [{ ingredientId: 'ing-d15', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '16', name: 'Gold', category: 'Coolers', price: 65, costPrice: 65, stock: 0, internalId: 'BEB016', type: 'drink', recipe: [{ ingredientId: 'ing-d16', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '17', name: 'Mayfair London Dry', category: 'Coolers', price: 75, costPrice: 75, stock: 0, internalId: 'BEB017', type: 'drink', recipe: [{ ingredientId: 'ing-d17', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '18', name: 'Txilar Garrafa', category: 'Cervejas', price: 50, costPrice: 50, stock: 0, internalId: 'BEB018', type: 'drink', recipe: [{ ingredientId: 'ing-d18', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '19', name: 'Txilar Txoti', category: 'Cervejas', price: 50, costPrice: 50, stock: 0, internalId: 'BEB019', type: 'drink', recipe: [{ ingredientId: 'ing-d19', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '20', name: 'Txilar Lata', category: 'Cervejas', price: 50, costPrice: 50, stock: 0, internalId: 'BEB020', type: 'drink', recipe: [{ ingredientId: 'ing-d20', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '21', name: 'Savana Dry', category: 'Coolers', price: 75, costPrice: 75, stock: 0, internalId: 'BEB021', type: 'drink', recipe: [{ ingredientId: 'ing-d21', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '22', name: 'Savana Lemon', category: 'Coolers', price: 75, costPrice: 75, stock: 0, internalId: 'BEB022', type: 'drink', recipe: [{ ingredientId: 'ing-d22', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  { id: '23', name: 'Flying Fish', category: 'Coolers', price: 70, costPrice: 70, stock: 0, internalId: 'BEB023', type: 'drink', recipe: [{ ingredientId: 'ing-d23', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200' },
  
  // VINHOS
  { id: '24', name: 'Vinho Portada', category: 'Vinhos', price: 550, costPrice: 550, stock: 0, internalId: 'BEB024', type: 'drink', recipe: [{ ingredientId: 'ing-d24', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200' },
  { id: '25', name: 'Vinho Pé Branco', category: 'Vinhos', price: 500, costPrice: 500, stock: 0, internalId: 'BEB025', type: 'drink', recipe: [{ ingredientId: 'ing-d25', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200' },
  { id: '26', name: 'Vinho Alandra', category: 'Vinhos', price: 500, costPrice: 500, stock: 0, internalId: 'BEB026', type: 'drink', recipe: [{ ingredientId: 'ing-d26', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200' },
  { id: '27', name: 'Vinho Casa do Bispo', category: 'Vinhos', price: 550, costPrice: 550, stock: 0, internalId: 'BEB027', type: 'drink', recipe: [{ ingredientId: 'ing-d27', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200' },
  { id: '28', name: 'Vinho 4th Street', category: 'Vinhos', price: 400, costPrice: 400, stock: 0, internalId: 'BEB028', type: 'drink', recipe: [{ ingredientId: 'ing-d28', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200' },
  { id: '29', name: 'Vinho Drostdy Hof', category: 'Vinhos', price: 390, costPrice: 390, stock: 0, internalId: 'BEB029', type: 'drink', recipe: [{ ingredientId: 'ing-d29', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200' },
  
  // GINS
  { id: '30', name: 'Gordon´s Gin', category: 'Gins', price: 450, costPrice: 450, stock: 0, internalId: 'BEB030', type: 'drink', recipe: [{ ingredientId: 'ing-d30', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
  { id: '31', name: 'Caravela Gin Pequena', category: 'Gins', price: 100, costPrice: 100, stock: 0, internalId: 'BEB031', type: 'drink', recipe: [{ ingredientId: 'ing-d31', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
  { id: '32', name: 'Caravela Gin Grande', category: 'Gins', price: 350, costPrice: 350, stock: 0, internalId: 'BEB032', type: 'drink', recipe: [{ ingredientId: 'ing-d32', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
  { id: '33', name: 'Soldier Pequena', category: 'Gins', price: 60, costPrice: 60, stock: 0, internalId: 'BEB033', type: 'drink', recipe: [{ ingredientId: 'ing-d33', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
  
  // WHISKYS
  { id: '34', name: 'Label 9 Horas', category: 'Whiskys', price: 65, costPrice: 65, stock: 0, internalId: 'BEB034', type: 'drink', recipe: [{ ingredientId: 'ing-d34', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
  { id: '35', name: 'Clan Mcgregor', category: 'Whiskys', price: 430, costPrice: 430, stock: 0, internalId: 'BEB035', type: 'drink', recipe: [{ ingredientId: 'ing-d35', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
  { id: '36', name: 'Tipo Tinto', category: 'Whiskys', price: 350, costPrice: 350, stock: 0, internalId: 'BEB036', type: 'drink', recipe: [{ ingredientId: 'ing-d36', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
  { id: '37', name: 'Amarula', category: 'Licores', price: 720, costPrice: 720, stock: 0, internalId: 'BEB037', type: 'drink', recipe: [{ ingredientId: 'ing-d37', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200' },
  
  // REFRIGERANTES
  { id: '38', name: 'Refresco Lata', category: 'Refrigerantes', price: 50, costPrice: 50, stock: 0, internalId: 'BEB038', type: 'drink', recipe: [{ ingredientId: 'ing-d38', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200' },
  { id: '39', name: 'Refresco Garrafa', category: 'Refrigerantes', price: 20, costPrice: 20, stock: 0, internalId: 'BEB039', type: 'drink', recipe: [{ ingredientId: 'ing-d39', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200' },
  { id: '40', name: 'Refresco Txoti', category: 'Refrigerantes', price: 25, costPrice: 25, stock: 0, internalId: 'BEB040', type: 'drink', recipe: [{ ingredientId: 'ing-d40', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200' },
  { id: '41', name: 'Refresco 1L', category: 'Refrigerantes', price: 65, costPrice: 65, stock: 0, internalId: 'BEB041', type: 'drink', recipe: [{ ingredientId: 'ing-d41', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200' },
  { id: '42', name: 'Refresco 2L', category: 'Refrigerantes', price: 110, costPrice: 110, stock: 0, internalId: 'BEB042', type: 'drink', recipe: [{ ingredientId: 'ing-d42', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200' },
  { id: '43', name: 'Refresco 1.5L', category: 'Refrigerantes', price: 85, costPrice: 85, stock: 0, internalId: 'BEB043', type: 'drink', recipe: [{ ingredientId: 'ing-d43', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200' },
  { id: '44', name: 'Cappy Txoti', category: 'Sumos', price: 35, costPrice: 35, stock: 0, internalId: 'BEB044', type: 'drink', recipe: [{ ingredientId: 'ing-d44', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200' },
  { id: '45', name: 'Cappy 1L', category: 'Sumos', price: 70, costPrice: 70, stock: 0, internalId: 'BEB045', type: 'drink', recipe: [{ ingredientId: 'ing-d45', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200' },
  { id: '46', name: 'Compal 500mL', category: 'Sumos', price: 70, costPrice: 70, stock: 0, internalId: 'BEB046', type: 'drink', recipe: [{ ingredientId: 'ing-d46', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200' },
  { id: '47', name: 'Compal 1L', category: 'Sumos', price: 130, costPrice: 130, stock: 0, internalId: 'BEB047', type: 'drink', recipe: [{ ingredientId: 'ing-d47', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200' },
  { id: '48', name: 'Santal 500mL', category: 'Sumos', price: 70, costPrice: 70, stock: 0, internalId: 'BEB048', type: 'drink', recipe: [{ ingredientId: 'ing-d48', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200' },
  { id: '49', name: 'Fizzy', category: 'Refrigerantes', price: 20, costPrice: 20, stock: 0, internalId: 'BEB049', type: 'drink', recipe: [{ ingredientId: 'ing-d49', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200' },
  { id: '50', name: 'Ceres', category: 'Sumos', price: 130, costPrice: 130, stock: 0, internalId: 'BEB050', type: 'drink', recipe: [{ ingredientId: 'ing-d50', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200' },
  { id: '51', name: 'Lemon Twist', category: 'Refrigerantes', price: 50, costPrice: 50, stock: 0, internalId: 'BEB051', type: 'drink', recipe: [{ ingredientId: 'ing-d51', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200' },
  { id: '52', name: 'Schweppes', category: 'Refrigerantes', price: 50, costPrice: 50, stock: 0, internalId: 'BEB052', type: 'drink', recipe: [{ ingredientId: 'ing-d52', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200' },
  
  // ENERGÉTICOS
  { id: '53', name: 'Dragon', category: 'Energéticos', price: 50, costPrice: 50, stock: 0, internalId: 'BEB053', type: 'drink', recipe: [{ ingredientId: 'ing-d53', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1622543925917-763c34f6a1a7?w=200' },
  { id: '54', name: 'Monster Energy', category: 'Energéticos', price: 85, costPrice: 85, stock: 0, internalId: 'BEB054', type: 'drink', recipe: [{ ingredientId: 'ing-d54', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1622543925917-763c34f6a1a7?w=200' },
  { id: '55', name: 'Redbull', category: 'Energéticos', price: 100, costPrice: 100, stock: 0, internalId: 'BEB055', type: 'drink', recipe: [{ ingredientId: 'ing-d55', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1622543925917-763c34f6a1a7?w=200' },
  { id: '56', name: 'Frozzy', category: 'Energéticos', price: 25, costPrice: 25, stock: 0, internalId: 'BEB056', type: 'drink', recipe: [{ ingredientId: 'ing-d56', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1622543925917-763c34f6a1a7?w=200' },
  
  // ÁGUAS
  { id: '57', name: 'Água Pequena', category: 'Águas', price: 25, costPrice: 25, stock: 0, internalId: 'BEB057', type: 'drink', recipe: [{ ingredientId: 'ing-d57', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200' },
  { id: '58', name: 'Água Grande', category: 'Águas', price: 50, costPrice: 50, stock: 0, internalId: 'BEB058', type: 'drink', recipe: [{ ingredientId: 'ing-d58', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200' },
  
  // BOLACHAS
  { id: '59', name: 'Bolacha Maria', category: 'Bolachas', price: 25, costPrice: 25, stock: 0, internalId: 'BOL001', type: 'drink', recipe: [{ ingredientId: 'ing-d59', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200' },
  { id: '60', name: 'Bolacha Água e Sal', category: 'Bolachas', price: 25, costPrice: 25, stock: 0, internalId: 'BOL002', type: 'drink', recipe: [{ ingredientId: 'ing-d60', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200' },
  { id: '61', name: 'Bolacha Cocô', category: 'Bolachas', price: 25, costPrice: 25, stock: 0, internalId: 'BOL003', type: 'drink', recipe: [{ ingredientId: 'ing-d61', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200' },
  { id: '62', name: 'Bolacha Pica Pau', category: 'Bolachas', price: 5, costPrice: 5, stock: 0, internalId: 'BOL004', type: 'drink', recipe: [{ ingredientId: 'ing-d62', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200' },
  { id: '63', name: 'Doritos', category: 'Bolachas', price: 100, costPrice: 100, stock: 0, internalId: 'BOL005', type: 'drink', recipe: [{ ingredientId: 'ing-d63', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=200' },
  
  // CIGARROS
  { id: '64', name: 'Cigarro GT', category: 'Cigarros', price: 100, costPrice: 100, stock: 0, internalId: 'CIG001', type: 'drink', recipe: [{ ingredientId: 'ing-d64', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1519181245277-cffeb31da2e3?w=200' },
  { id: '65', name: 'Cigarro Pall Mall Azul', category: 'Cigarros', price: 120, costPrice: 120, stock: 0, internalId: 'CIG002', type: 'drink', recipe: [{ ingredientId: 'ing-d65', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1519181245277-cffeb31da2e3?w=200' },
  
  // KOMBUCHA
  { id: '66', name: 'Kombucha', category: 'Bebidas', price: 50, costPrice: 50, stock: 0, internalId: 'BEB059', type: 'drink', recipe: [{ ingredientId: 'ing-d66', quantity: 1, unit: 'un' }], image: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=200' },
  // REFEIÇÕES
  { id: 'meal1', name: 'Dose Frango com Arroz e Salada', category: 'Refeições', price: 180, costPrice: 100, stock: 0, internalId: 'REF001', type: 'meal', recipe: [{ ingredientId: 'ing-m1', quantity: 250, unit: 'g' }, { ingredientId: 'ing-m2', quantity: 200, unit: 'g' }, { ingredientId: 'ing-m3', quantity: 0.2, unit: 'un' }], image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200' },
  { id: 'meal2', name: 'Dose Frango com Batata e Salada', category: 'Refeições', price: 240, costPrice: 130, stock: 0, internalId: 'REF002', type: 'meal', recipe: [{ ingredientId: 'ing-m1', quantity: 250, unit: 'g' }, { ingredientId: 'ing-m4', quantity: 300, unit: 'g' }, { ingredientId: 'ing-m3', quantity: 0.2, unit: 'un' }], image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200' },
  { id: 'meal3', name: 'Frango Inteiro com Arroz e Salada', category: 'Refeições', price: 650, costPrice: 400, stock: 0, internalId: 'REF003', type: 'meal', recipe: [{ ingredientId: 'ing-m1', quantity: 1000, unit: 'g' }, { ingredientId: 'ing-m2', quantity: 500, unit: 'g' }, { ingredientId: 'ing-m3', quantity: 0.5, unit: 'un' }], image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200' },
  { id: 'meal4', name: 'Frango Inteiro com Batata e Salada', category: 'Refeições', price: 700, costPrice: 450, stock: 0, internalId: 'REF004', type: 'meal', recipe: [{ ingredientId: 'ing-m1', quantity: 1000, unit: 'g' }, { ingredientId: 'ing-m4', quantity: 600, unit: 'g' }, { ingredientId: 'ing-m3', quantity: 0.5, unit: 'un' }], image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200' },
  { id: 'meal5', name: 'Peixe 150mt', category: 'Peixes', price: 150, costPrice: 150, stock: 0, internalId: 'PEI001', type: 'meal', recipe: [], image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200' },
  { id: 'meal6', name: 'Peixe 200mt', category: 'Peixes', price: 200, costPrice: 200, stock: 0, internalId: 'PEI002', type: 'meal', recipe: [], image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200' },
  { id: 'meal7', name: 'Peixe 250mt', category: 'Peixes', price: 250, costPrice: 250, stock: 0, internalId: 'PEI003', type: 'meal', recipe: [], image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200' },
  { id: 'meal8', name: 'Carne de Porco (por Kg)', category: 'Carnes', price: 650, costPrice: 650, stock: 0, internalId: 'CAR001', type: 'meal', recipe: [{ ingredientId: 'ing-m5', quantity: 1000, unit: 'g' }], image: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=200' },
  { id: 'meal9', name: 'Guisado de Carne de Vaca com Arroz', category: 'Refeições', price: 150, costPrice: 150, stock: 0, internalId: 'REF005', type: 'meal', recipe: [{ ingredientId: 'ing-m6', quantity: 250, unit: 'g' }, { ingredientId: 'ing-m2', quantity: 200, unit: 'g' }], image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=200' },
  
  // ACOMPANHAMENTOS
  { id: 'acomp1', name: 'Arroz', category: 'Acompanhamentos', price: 50, costPrice: 50, stock: 0, internalId: 'ACO001', type: 'meal', recipe: [{ ingredientId: 'ing-m2', quantity: 200, unit: 'g' }], image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200' },
  { id: 'acomp2', name: 'Batata', category: 'Acompanhamentos', price: 60, costPrice: 60, stock: 0, internalId: 'ACO002', type: 'meal', recipe: [{ ingredientId: 'ing-m4', quantity: 300, unit: 'g' }], image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200' },
  { id: 'acomp3', name: 'Salada', category: 'Acompanhamentos', price: 30, costPrice: 30, stock: 0, internalId: 'ACO003', type: 'meal', recipe: [{ ingredientId: 'ing-m3', quantity: 0.3, unit: 'un' }], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200' },
];
*/

const mockTables: Table[] = [];

const mockOrders: Order[] = [];

const mockSales: Sale[] = [];

export const useStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),
  
  // Products
  products: mockProducts,
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  updateProduct: (id, updatedProduct) => set((state) => ({
    products: state.products.map((p) => p.id === id ? { ...p, ...updatedProduct } : p),
  })),
  deleteProduct: (id) => set((state) => ({
    products: state.products.filter((p) => p.id !== id),
  })),
  
  // Tables
  tables: mockTables,
  setTables: (tables) => set({ tables }),
  addTable: (table) => set((state) => ({ tables: [...state.tables, table] })),
  updateTable: (id, updatedTable) => set((state) => ({
    tables: state.tables.map((t) => t.id === id ? { ...t, ...updatedTable } : t),
  })),
  
  // Orders
  orders: mockOrders,
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
  updateOrder: (id, updatedOrder) => set((state) => ({
    orders: state.orders.map((o) => o.id === id ? { ...o, ...updatedOrder } : o),
  })),
  
  // Sales
  sales: mockSales,
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
  ingredients: mockIngredients,
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
