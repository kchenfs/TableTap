import { APIMenuItem, MenuItem, MenuCategory } from '../types';

export const transformAPIMenuItem = (apiItem: APIMenuItem): MenuItem => ({
  id: apiItem.ItemNumber,
  name: apiItem.ItemName,
  description: apiItem.ItemDescription,
  price: apiItem.Price,
  category: apiItem.Category.toLowerCase().replace(/\s+/g, '-'),
  location: apiItem.Location
});

export const organizeMenuByCategory = (apiItems: APIMenuItem[]): MenuCategory[] => {
  const transformedItems = apiItems.map(transformAPIMenuItem);
  
  // Get unique categories
  const uniqueCategories = Array.from(
    new Set(apiItems.map(item => item.Category))
  );

  // Create category objects with items
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