// ---- OPTION TYPES ----
export interface OptionItem {
  name: string;
  priceModifier: number; // Additional cost for this option
}

export interface OptionGroup {
  name: string;
  type: 'VARIANT' | 'ADD_ON'; // Variant = select one, Add-on = multiple allowed
  required: boolean;
  items: OptionItem[];
}

// ---- MENU ITEM ----
// This represents an item used internally by the UI
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  Price: number;         // Base price from API
  category: string;      // category slug (e.g. "special-roll")
  location: string;      // dine-in vs take-out tagging
  options: OptionGroup[]; // Always array (never undefined)
}

// ---- RAW API RESPONSE ----
// Matches your DynamoDB / Lambda shape
export interface APIMenuItem {
  ItemNumber: string;
  ItemName: string;
  Description: string;
  Price: number;
  Category: string;
  Location: string;
  Options?: OptionGroup[]; // Optional in API, normalized in transform step
}

// ---- CART ITEM ----
// Represents a SPECIFIC configured item inside the user’s cart
export interface CartItem {
  cartId: string; // unique per cart entry
  menuItem: MenuItem;

  // Stores selected options, grouped by option group name
  // Example: { "Size": { name: "Large", priceModifier: 2.00 } }
  selectedOptions: Record<string, OptionItem>;

  quantity: number;

  // finalPrice = base Price + sum(priceModifiers)
  finalPrice: number;
}

// ---- CATEGORY USED BY UI ----
export interface MenuCategory {
  id: string;       // "special-roll"
  name: string;     // "Special Roll"
  items: MenuItem[];
}
