// src/config/categoryColors.ts
// Centralised color mapping for categories. Keep presentation concerns in config.
// All comments in English per project convention.

import type { CategoryKey } from '../types/categoryLabels'

// Fixed color palette for each category key
export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  // Greens
  fruits_vegetables: '#19741cff',
  sports_fitness: '#43A047',
  travel_holidays: '#26dab6ff',
  // Blues/Teals
  health_medicine: '#0771aaff',
  drinks: '#1caceeff',
  frozen: '#75cff9ff',
  subscriptions_digital: '#35c6e7ff',
  // Purples
  liquor: '#AB47BC',
  personal_care_beauty: '#BA68C8',
  professional_services: '#9575CD',
  clothing_footwear: '#7986CB',
  // Reds/Pinks
  entertainment: '#e64a4aff',
  gifts_occasions: '#E57373',
  eating_out: '#F06292',
  baby_maternity: '#FFCDD2',
  // Oranges/Corals
  meat_seafood_deli: '#e72b2bff',
  transport_fuel: '#f35b2cff',
  bakery: '#dc9a37ff',
  // Yellows/Ambers
  dairy_eggs_fridge: '#efca36ff',
  utilities_bills: '#bdb6a2ff',
  // Browns/Neutrals
  pantry_snacks: '#8D6E63',
  pets: '#855240ff',
  electronics_tech: '#86a7b8ff',
  coffee_tea: '#593327ff',
  home_lifestyle: '#746d56ff',
  cleaning_maintenance: '#58a7b4ff',
  other: '#b0b0b0ff',
}

// Helper to build a domain→color map for a given key order
export function buildCategoryColorMap(keys: readonly CategoryKey[]): Record<CategoryKey, string> {
  const map = {} as Record<CategoryKey, string>
  keys.forEach((k) => {
    map[k] = CATEGORY_COLORS[k] || '#ccc' // Fallback for safety
  })
  return map
}
