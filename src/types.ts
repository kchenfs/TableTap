export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  location: string;
}

export interface APIMenuItem {
  ItemNumber: string;
  ItemName: string;
  ItemDescription: string;
  Price: number;
  Category: string;
  Location: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}