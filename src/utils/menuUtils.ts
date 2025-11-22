import { MenuItem, MenuCategory } from './types';

// Helper to safely get a property regardless of casing (PascalCase or camelCase)
const getProp = (item: any, key: string) => {
  // Check for exact match (e.g., "ItemName")
  if (item[key] !== undefined) return item[key];
  // Check for camelCase (e.g., "itemName")
  const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
  if (item[camelKey] !== undefined) return item[camelKey];
  // Check for lowercase (e.g., "itemname")
  const lowerKey = key.toLowerCase();
  if (item[lowerKey] !== undefined) return item[lowerKey];
  
  return undefined;
};

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
    // Normalize category: lowercase and replace spaces with dashes
    category: (category || 'uncategorized').toLowerCase().replace(/\s+/g, '-'),
    location: location || '',
    options: options || [],
  };
};

export const organizeMenuByCategory = (apiItems: any[]): MenuCategory[] => {
  if (!Array.isArray(apiItems)) {
    console.warn("organizeMenuByCategory: apiItems is not an array", apiItems);
    return [];
  }

  // 1. Filter valid items using the safe getter
  const validItems = apiItems.filter(item => {
    const category = getProp(item, 'Category');
    return item && category;
  });
  
  if (validItems.length === 0) {
    console.warn("organizeMenuByCategory: No valid items found after filtering. Check API response keys.");
    // Debug log to see what the first raw item looks like
    if (apiItems.length > 0) console.log("Sample raw item:", apiItems[0]);
    return [];
  }

  const transformedItems = validItems.map(transformAPIMenuItem);
  
  // 2. Create unique category names
  const uniqueCategories = Array.from(
    new Set(validItems.map(item => getProp(item, 'Category')))
  ) as string[];

  // 3. Group items
  return uniqueCategories.map(categoryName => {
    // Ensure we match the normalized category slug generated in transformAPIMenuItem
    const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-');
    
    const categoryItems = transformedItems.filter(item => 
      item.category === categoryId
    );

    return {
      id: categoryId,
      name: categoryName, // Keep original display name
      items: categoryItems
    };
  });
};