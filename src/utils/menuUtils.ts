import { MenuItem, MenuCategory } from './types';

// --- CONFIGURATION: PREFERRED CATEGORY ORDER ---
const CATEGORY_ORDER = [
  "Daily Special", // API uses singular "Special" based on logs
  "Appetizer",
  "Soup & Salad",
  "Special Roll",
  "Maki",
  "Vegetable Choice",
  "Roll Set Combo",
  "Sushi & Sashimi",
  "Lover Boat",
  "Maki Tray",
  "Sushi & Maki Tray",
  "Sushi, Sashimi & Maki Tray",
  "Dessert",
  "A La Carte",
  "Bento Box",
  "Don",
  "Rice/Fried Rice",
  "Yaki Udon",
  "Noodle Soup",
  "Drinks",
  "Alcohol"
];

// Helper to safely get a property regardless of casing (PascalCase or camelCase)
const getProp = (item: any, key: string) => {
  if (!item) return undefined;
  if (item[key] !== undefined) return item[key];

  const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
  if (item[camelKey] !== undefined) return item[camelKey];

  const lowerKey = key.toLowerCase();
  if (item[lowerKey] !== undefined) return item[lowerKey];

  return undefined;
};

// Transform 1 API item into the MenuItem type expected by the UI
export const transformAPIMenuItem = (apiItem: any): MenuItem => {
  const itemNumber = getProp(apiItem, 'ItemNumber');
  const itemName = getProp(apiItem, 'ItemName');
  const description = getProp(apiItem, 'Description');
  const price = getProp(apiItem, 'Price');
  const category = getProp(apiItem, 'Category');
  const location = getProp(apiItem, 'Location');
  const options = getProp(apiItem, 'Options');

  return {
    id: String(itemNumber || ''),
    name: itemName || 'Unnamed Item',
    description: description || '',
    Price: Number(price || 0),

    // Internal category slug for DOM ids
    category: (category || 'Uncategorized')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/&/g, 'and'),

    location: location || '',
    // Ensure options always returns an array
    options: Array.isArray(options) ? options : []
  };
};

// Organize items into categories the UI can render
export const organizeMenuByCategory = (apiResponse: any): MenuCategory[] => {
  let itemsToProcess = apiResponse;

  // 1. Unwrap the Lambda Proxy "envelope" (Critical Fix)
  if (itemsToProcess && !Array.isArray(itemsToProcess)) {
    if (itemsToProcess.body) {
      try {
        itemsToProcess = typeof itemsToProcess.body === 'string' 
          ? JSON.parse(itemsToProcess.body) 
          : itemsToProcess.body;
      } catch (e) {
        console.error("Failed to parse Lambda body JSON:", e);
        return [];
      }
    } else if (itemsToProcess.Items) {
      itemsToProcess = itemsToProcess.Items;
    }
  }

  // 2. Safety check
  if (!Array.isArray(itemsToProcess)) {
    console.warn("organizeMenuByCategory: Data is not an array. Received:", apiResponse);
    return [];
  }

  // Filter out invalid items
  const validItems = itemsToProcess.filter(item => {
    const category = getProp(item, 'Category');
    return item && category;
  });

  if (validItems.length === 0) {
    return [];
  }

  // Transform all items
  const transformedItems = validItems.map(transformAPIMenuItem);

  // Extract unique category names
  const uniqueCategories = Array.from(
    new Set(validItems.map(item => getProp(item, 'Category')))
  ) as string[];

  // --- CUSTOM SORTING LOGIC ---
  const sortedCategories = uniqueCategories.sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);

    // If both are in our preferred list, sort by that order
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // If only A is in the list, A goes first
    if (indexA !== -1) return -1;

    // If only B is in the list, B goes first
    if (indexB !== -1) return 1;

    // If neither are in the list, fall back to alphabetical
    return a.localeCompare(b);
  });

  // Build category objects
  return sortedCategories.map(categoryName => {
    const slug = categoryName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/&/g, 'and');

    const itemsInCategory = transformedItems.filter(item => item.category === slug);

    return {
      id: slug,
      name: categoryName,
      items: itemsInCategory
    };
  });
};