// These new interfaces describe the options for a menu item
export interface OptionItem {
  name: string;
  priceModifier: number;
}

export interface OptionGroup {
  name: string;
  type: 'VARIANT' | 'ADD_ON';
  required: boolean;
  items: OptionItem[];
}

// MenuItem is updated to use a basePrice and an optional `options` array
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  Price: number; 
  category: string;
  location: string;
  options?: OptionGroup[]; // Added to hold customization data
}

// Your API response type should now include an optional Options field
export interface APIMenuItem {
  ItemNumber: string;
  ItemName: string;
  Description: string;
  Price: number;
  Category: string;
  Location: string;
  Options?: OptionGroup[];
}

// CartItem is now more detailed to hold the final state of a customized item
export interface CartItem {
  cartId: string; // A unique ID for this specific entry in the cart
  menuItem: MenuItem;
  selectedOptions: Record<string, OptionItem>; // Stores the user's choices
  quantity: number;
  finalPrice: number; // The basePrice + all selected priceModifiers
}

// This interface remains unchanged
export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

