import { MenuItem, MenuCategory } from './types';

// Helper to safely get a property regardless of casing (PascalCase or camelCase)
const getProp = (item: any, key: string) => {
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
export const organizeMenuByCategory = (apiItems: any[]): MenuCategory[] => {
  if (!Array.isArray(apiItems)) {
    console.warn("organizeMenuByCategory: apiItems is not an array", apiItems);
    return [];
  }

  // Filter out invalid items (missing Category)
  const validItems = apiItems.filter(item => {
    const category = getProp(item, 'Category');
    return item && category;
  });

  if (validItems.length === 0) {
    console.warn("organizeMenuByCategory: No valid items found. Check API keys.");
    if (apiItems.length > 0) console.log("Sample raw item:", apiItems[0]);
    return [];
  }

  // Transform all items
  const transformedItems = validItems.map(transformAPIMenuItem);

  // Extract readable category names directly from API
  const uniqueCategories = Array.from(
    new Set(validItems.map(item => getProp(item, 'Category')))
  ) as string[];

  // Optional: Sort categories (common restaurant ordering)
  const sortedCategories = uniqueCategories.sort((a, b) =>
    a.localeCompare(b)
  );

  // Build category objects
  return sortedCategories.map(categoryName => {
    const slug = categoryName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/&/g, 'and');

    const itemsInCategory = transformedItems.filter(item => item.category === slug);

    return {
      id: slug,          // Used for DOM and scroll logic
      name: categoryName, // Pretty name shown on website
      items: itemsInCategory
    };
  });
};
