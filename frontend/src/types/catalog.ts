export interface Presentation {
  size: string;
  cost: number;
  wholesale: number;
  retail: number | null;
}

export interface CatalogProduct {
  id: number;
  name: string;
  process: string;
  presentations: Presentation[];
  types: string[];
}