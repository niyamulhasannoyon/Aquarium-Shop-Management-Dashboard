export type UnitType = 'Piece' | 'Pair';

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  default_unit: UnitType;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  created_at: string;
}

export interface Purchase {
  id: number;
  product_id: number;
  unit_type: UnitType;
  quantity: number;
  multiplier: number;
  total_pieces_added: number;
  unit_cost: number;
  total_investment: number;
  purchase_date: string;
}
