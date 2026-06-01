export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  packages?: PackageType[];
}

export interface PackageType {
  id: string;
  name: string;
  quantity: number;
  costPerPackage: number;
}
