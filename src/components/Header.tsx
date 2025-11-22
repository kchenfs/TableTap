import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { CartItem } from '../types';

interface HeaderProps {
  cart: CartItem[];
  onCartClick: () => void;
}

export default function Header({ cart = [], onCartClick }: HeaderProps) { // <--- Default to []
  // Use optional chaining or fallback to empty array
  const totalItems = (cart || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <header className="sticky top-0 bg-slate-900/80 backdrop-blur-lg z-20 border-b border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center">
          <div className="flex-1">
            <a href="#" className="text-xl font-semibold tracking-tight text-slate-50">
              Momotaro Sushi
            </a>
          </div>
          
          <div className="flex-1 flex items-center justify-end">
            <button 
              onClick={onCartClick}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 shadow-sm ring-1 ring-slate-100/10 hover:bg-slate-700 hover:text-slate-50 transition-all active:scale-95"
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={1.5} />
              <span>Cart</span>
              {totalItems > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}