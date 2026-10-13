export const CATEGORIES = [
  { value: 'cooked-meals', label: 'Cooked meals', emoji: '🍛' },
  { value: 'bakery', label: 'Bakery', emoji: '🥖' },
  { value: 'fruits-vegetables', label: 'Fruits & vegetables', emoji: '🥕' },
  { value: 'dairy', label: 'Dairy', emoji: '🥛' },
  { value: 'grains-staples', label: 'Grains & staples', emoji: '🌾' },
  { value: 'packaged', label: 'Packaged food', emoji: '🥫' },
  { value: 'beverages', label: 'Beverages', emoji: '🧃' },
  { value: 'other', label: 'Other', emoji: '🍱' },
];

export const DIETARY = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'non-vegetarian', label: 'Non-veg' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'halal', label: 'Halal' },
  { value: 'jain', label: 'Jain' },
];

export const UNITS = ['servings', 'meals', 'kg', 'packets', 'boxes', 'litres', 'items'];

// Map starts here until the browser shares the user's location (Hyderabad by default)
export const DEFAULT_CENTER = [
  Number(import.meta.env.VITE_DEFAULT_LAT) || 17.385,
  Number(import.meta.env.VITE_DEFAULT_LNG) || 78.4867,
];

const byValue = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));
export const categoryInfo = (value) => byValue[value] || byValue.other;
export const dietaryLabel = (value) => DIETARY.find((d) => d.value === value)?.label || value;
