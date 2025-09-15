// File: menuUtils.ts

import { MenuItem, MenuCategory } from './types';

// Simplified transformer for the new, clean JSON
export const transformAPIMenuItem = (apiItem: any): MenuItem => ({
  id: String(apiItem.ItemNumber),
  name: apiItem.ItemName,
  description: apiItem.Description,
  Price: Number(apiItem.Price),
  category: (apiItem.Category || 'uncategorized').toLowerCase().replace(/\s+/g, '-'),
  location: apiItem.Location,
  // The options are already in the correct format, no change needed here
  options: apiItem.Options || [],
});

// Simplified organizer function
export const organizeMenuByCategory = (apiItems: any[]): MenuCategory[] => {
  // Filter out any items that are null, undefined, or don't have a valid category
  const validItems = apiItems.filter(item => item && item.Category);
  
  if (validItems.length === 0) return [];

  const transformedItems = validItems.map(transformAPIMenuItem);
  
  // Create a set of unique category names from the valid items
  const uniqueCategories = Array.from(
    new Set(validItems.map(item => item.Category))
  );

  return uniqueCategories.map(categoryName => {
    const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-');
    const categoryItems = transformedItems.filter(item => 
      item.category === categoryId
    );

    return {
      id: categoryId,
      name: categoryName,
      items: categoryItems
    };
  }).filter(category => category.items.length > 0);
};