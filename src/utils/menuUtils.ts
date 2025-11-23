import { MenuItem, MenuCategory } from './types';

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

  // --- FIX: DETECT AND UNWRAP LAMBDA PROXY RESPONSE ---
  
  // 1. Check if we received the standard AWS "envelope" object
  if (itemsToProcess && !Array.isArray(itemsToProcess)) {
    // If there is a 'body' property, that is where the data lives
    if (itemsToProcess.body) {
      try {
        // The body is usually a JSON string in Proxy Integration, so we parse it
        itemsToProcess = typeof itemsToProcess.body === 'string' 
          ? JSON.parse(itemsToProcess.body) 
          : itemsToProcess.body;
      } catch (e) {
        console.error("Failed to parse Lambda body JSON:", e);
        return [];
      }
    } 
    // Fallback: If using raw DynamoDB scans without proxy, data might be in 'Items'
    else if (itemsToProcess.Items) {
      itemsToProcess = itemsToProcess.Items;
    }
  }
  // --- END FIX ---

  // 2. Final validation: Do we have an array now?
  if (!Array.isArray(itemsToProcess)) {
    console.warn("organizeMenuByCategory: Data is not an array. Received:", apiResponse);
    return [];
  }

  // Filter out invalid items (missing Category)
  const validItems = itemsToProcess.filter(item => {
    const category = getProp(item, 'Category');
    return item && category;
  });

  if (validItems.length === 0) {
    console.warn("organizeMenuByCategory: No valid items found after filtering.");
    return [];
  }

  // Transform all items
  const transformedItems = validItems.map(transformAPIMenuItem);

  // Extract readable category names directly from API
  const uniqueCategories = Array.from(
    new Set(validItems.map(item => getProp(item, 'Category')))
  ) as string[];

  // Sort categories alphabetically
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