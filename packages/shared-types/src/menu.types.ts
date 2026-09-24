// =============================================================================
// ROS Shared Types — Menu
// =============================================================================

export type FoodType = 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';

export type SpiceLevel = 'NONE' | 'MILD' | 'MEDIUM' | 'HOT' | 'VERY_HOT';

export interface MenuCategory {
  id: string;
  name: string;
  imageUrl?: string;
  sortOrder: number;
  parentId?: string;
  isActive: boolean;
  children?: MenuCategory[];
}

export interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
  cost: number;
  isActive: boolean;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  modifiers: Modifier[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sku?: string;
  barcode?: string;
  foodType: FoodType;
  spiceLevel: SpiceLevel;
  allergens: string[];
  preparationTimeMins?: number;
  kitchenStationId?: string;
  taxCategoryId?: string;
  isAvailable: boolean;
  isActive: boolean;
  variants: MenuItemVariant[];
  modifierGroups: ModifierGroup[];
}
