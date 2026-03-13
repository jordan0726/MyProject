// src/types/categoryLabels.ts
// Canonical category keys used throughout the app (domain layer).
// Keep this list in sync with backend enumerations. Keys are stable; labels can change (i18n).
export type CategoryKey =
  | 'fruits_vegetables'
  | 'meat_seafood_deli'
  | 'dairy_eggs_fridge'
  | 'frozen'
  | 'pantry_snacks'
  | 'bakery'
  | 'coffee_tea'
  | 'drinks'
  | 'liquor'
  | 'eating_out'
  | 'health_medicine'
  | 'personal_care_beauty'
  | 'cleaning_maintenance'
  | 'baby_maternity'
  | 'pets'
  | 'clothing_footwear'
  | 'electronics_tech'
  | 'home_lifestyle'
  | 'sports_fitness'
  | 'gifts_occasions'
  | 'entertainment'
  | 'subscriptions_digital'
  | 'professional_services'
  | 'utilities_bills'
  | 'transport_fuel'
  | 'travel_holidays'
  | 'other';

// Human-readable labels for display (UI layer). These can be localized later.
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  fruits_vegetables: 'Fruits & Vegetables',
  meat_seafood_deli: 'Meat & Seafood & Deli',
  dairy_eggs_fridge: 'Dairy & Eggs & Fridge',
  frozen: 'Frozen',
  pantry_snacks: 'Pantry & Snacks',
  bakery: 'Bakery',
  coffee_tea: 'Coffee & Tea',
  drinks: 'Drinks',
  liquor: 'Liquor',
  eating_out: 'Eating Out',
  health_medicine: 'Health & Medicine',
  personal_care_beauty: 'Personal Care & Beauty',
  cleaning_maintenance: 'Cleaning & Maintenance',
  baby_maternity: 'Baby & Maternity',
  pets: 'Pets',
  clothing_footwear: 'Clothing & Footwear',
  electronics_tech: 'Electronics & Tech',
  home_lifestyle: 'Home & Lifestyle',
  sports_fitness: 'Sports & Fitness',
  gifts_occasions: 'Gifts & Occasions',
  entertainment: 'Entertainment',
  subscriptions_digital: 'Subscriptions & Digital Services',
  professional_services: 'Professional Services',
  utilities_bills: 'Utilities & Bills',
  transport_fuel: 'Transport & Fuel',
  travel_holidays: 'Travel & Holidays',
  other: 'Other',
};

// Legacy → current key compatibility map (temporary while backend transitions).
export const LEGACY_CATEGORY_KEY_ALIASES: Record<string, CategoryKey> = {
  'fresh_produce': 'fruits_vegetables',
  'fresh produce': 'fruits_vegetables',
  'fruits vegetables': 'fruits_vegetables',
  'fruits & vegetables': 'fruits_vegetables',
  'food': 'fruits_vegetables',
  'meat_seafood': 'meat_seafood_deli',
  'meat seafood': 'meat_seafood_deli',
  'meat & seafood': 'meat_seafood_deli',
  'meat & seafood & deli': 'meat_seafood_deli',
  'dairy_eggs': 'dairy_eggs_fridge',
  'dairy eggs': 'dairy_eggs_fridge',
  'dairy & eggs': 'dairy_eggs_fridge',
  'beverages': 'drinks',
  'drink': 'drinks',
  'alcohol': 'liquor',
  'home_cleaning': 'cleaning_maintenance',
  'home cleaning': 'cleaning_maintenance',
  'home & cleaning': 'cleaning_maintenance',
  'cleaning maintenance': 'cleaning_maintenance',
  'cleaning & maintenance': 'cleaning_maintenance',
  'stationery_office': 'home_lifestyle',
  'stationery office': 'home_lifestyle',
  'stationery & office': 'home_lifestyle',
  'home lifestyle': 'home_lifestyle',
  'home & lifestyle': 'home_lifestyle',
  'pantry_snacks': 'pantry_snacks',
  'pantry snacks': 'pantry_snacks',
  'pantry & snacks': 'pantry_snacks',
  'bakery': 'bakery',
  'coffee_tea': 'coffee_tea',
  'coffee tea': 'coffee_tea',
  'coffee & tea': 'coffee_tea',
  'eating out': 'eating_out',
  'health_medicine': 'health_medicine',
  'health medicine': 'health_medicine',
  'health & medicine': 'health_medicine',
  'personal care beauty': 'personal_care_beauty',
  'personal care & beauty': 'personal_care_beauty',
  'baby maternity': 'baby_maternity',
  'baby & maternity': 'baby_maternity',
  'pets': 'pets',
  'clothing footwear': 'clothing_footwear',
  'clothing & footwear': 'clothing_footwear',
  'electronics tech': 'electronics_tech',
  'electronics & tech': 'electronics_tech',
  'sports fitness': 'sports_fitness',
  'sports & fitness': 'sports_fitness',
  'gifts occasions': 'gifts_occasions',
  'gifts & occasions': 'gifts_occasions',
  'entertainment': 'entertainment',
  'subscriptions digital services': 'subscriptions_digital',
  'subscriptions & digital services': 'subscriptions_digital',
  'professional services': 'professional_services',
  'utilities bills': 'utilities_bills',
  'utilities & bills': 'utilities_bills',
  'transport fuel': 'transport_fuel',
  'transport & fuel': 'transport_fuel',
  'travel holidays': 'travel_holidays',
  'travel & holidays': 'travel_holidays',
  'other': 'other',
};

export function normalizeCategoryKey(value: unknown): CategoryKey | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed in CATEGORY_LABELS) return trimmed as CategoryKey
  const lower = trimmed.toLowerCase()
  if (lower in CATEGORY_LABELS) return lower as CategoryKey
  return LEGACY_CATEGORY_KEY_ALIASES[lower] ?? undefined
}

export function getCategoryLabel(value: string | undefined): string {
  const key = normalizeCategoryKey(value)
  return key ? CATEGORY_LABELS[key] : (value ?? CATEGORY_LABELS.other)
}
