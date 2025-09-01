import React from 'react';
import { Plus } from 'lucide-react';
import { MenuItem as MenuItemType } from '../types';

interface MenuItemProps {
  item: MenuItemType;
  onAddToCart: (item: MenuItemType) => void;
}

export default function MenuItem({ item, onAddToCart }: MenuItemProps) {
  return (
    <div className="py-5 flex items-center justify-between">
      <div className="space-y-1 flex-1 pr-4">
        <h3 className="text-base font-medium text-slate-200">{item.name}</h3>
        <p className="text-sm text-slate-400">{item.description}</p>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-base font-semibold text-slate-50 w-16 text-right">
          ${Number(item.price).toFixed(2)}
        </p>
        <button 
          onClick={() => onAddToCart(item)}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 shadow-sm ring-1 ring-slate-100/10 hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>
    </div>
  );
}