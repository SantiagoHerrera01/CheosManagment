export interface Product {
  id: number;
  name: string;
  process: string;
  presentation: string;
  grind: "Molido" | "Grano";
  price: number;
  stock: number;
  image: string;
  active: boolean;
}