import React from 'react';
import { Plus } from 'lucide-react';
import { MenuItem as MenuItemType } from '../types';

interface MenuItemProps {
  item: MenuItemType;
  onSelect: (item: MenuItemType) => void;
}

export default function MenuItem({ item, onSelect }: MenuItemProps) {
  const hasOptions = item.options && item.options.length > 0;
  
  // Check if any options actually affect the price
  const hasPriceAffectingOptions = React.useMemo(() => {
    if (!item.options || !Array.isArray(item.options)) {
      return false;
    }
    
    return item.options.some(group => {
      if (!group.items || !Array.isArray(group.items)) {
        return false;
      }
      return group.items.some(option => {
        const modifier = typeof option.priceModifier === 'number' ? option.priceModifier : 0;
        return modifier !== 0;
      });
    });
  }, [item.options]);

  return (
    <div className="py-5 flex items-center justify-between">
      <div className="space-y-1 flex-1 pr-4">
        <h3 className="text-base font-medium text-slate-200">{item.name}</h3>
        <p className="text-sm text-slate-400">{item.description}</p>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-base font-semibold text-slate-50 w-20 text-right">
          ${Number(item.Price).toFixed(2)}{hasPriceAffectingOptions ? '+' : ''}
        </p>
        <button 
          onClick={() => onSelect(item)}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 shadow-sm ring-1 ring-slate-100/10 hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-95 w-28"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}