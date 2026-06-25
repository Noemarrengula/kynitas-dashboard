export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image?: string;
  internal_id: string;
  type: 'drink' | 'meal' | 'cigarette';
  recipe?: RecipeItem[];
  estimatedCost?: number;
  dailyStock?: number;
  fracionavel?: boolean;
  precoDose?: number;
  dosesPorGarrafa?: number;
  costPrice?: number;
  ivaRate?: number;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
  unit: string;
}
