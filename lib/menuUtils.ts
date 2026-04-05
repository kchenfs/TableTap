import { MenuItem, MenuCategory } from './types';

const CATEGORY_ORDER = [
  "Daily Special","Appetizer","Soup & Salad","Special Roll","Maki","Vegetable Choice",
  "Roll Set Combo","Sushi & Sashimi","Lover Boat","Maki Tray","Sushi & Maki Tray",
  "Sushi, Sashimi & Maki Tray","Dessert","A La Carte","Bento Box","Don","Rice/Fried Rice",
  "Yaki Udon","Noodle Soup","Drinks","Alcohol"
];

const getProp = (item: any, key: string) => {
  if (!item) return undefined;
  if (item[key] !== undefined) return item[key];
  const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
  if (item[camelKey] !== undefined) return item[camelKey];
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
  const imageUrl = getProp(apiItem, 'ImageUrl'); // CloudFront URL stored in DynamoDB
  return {
    id: String(itemNumber || ''),
    name: itemName || 'Unnamed Item',
    description: description || '',
    Price: Number(price || 0),
    category: (category || 'Uncategorized').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and'),
    location: location || '',
    options: Array.isArray(options) ? options : [],
    imageUrl: imageUrl || undefined,
  };
};

export const organizeMenuByCategory = (apiResponse: any): MenuCategory[] => {
  let items = apiResponse;
  if (items && !Array.isArray(items)) {
    if (items.body) {
      try { items = typeof items.body === 'string' ? JSON.parse(items.body) : items.body; }
      catch (e) { return []; }
    } else if (items.Items) { items = items.Items; }
  }
  if (!Array.isArray(items)) return [];
  const valid = items.filter((i: any) => i && getProp(i, 'Category'));
  if (!valid.length) return [];
  const transformed = valid.map(transformAPIMenuItem);
  const cats = Array.from(new Set(valid.map((i: any) => getProp(i, 'Category')))) as string[];
  const sorted = cats.sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
  return sorted.map(name => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
    return { id: slug, name, items: transformed.filter((i: MenuItem) => i.category === slug) };
  });
};
