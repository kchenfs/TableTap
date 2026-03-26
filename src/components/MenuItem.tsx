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
    if (!item.options || !Array.isArray(item.options)) return false;
    return item.options.some(group => 
      group.items && group.items.some(option => 
        (option.priceModifier || 0) !== 0
      )
    );
  }, [item.options]);

  return (
    <div className="py-6 flex items-center justify-between group">
      {/* Left Side: Name & Description */}
      <div className="space-y-1 flex-1 pr-6">
        <h3 className="text-lg font-medium text-slate-100 group-hover:text-white transition-colors">
          {item.name}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed max-w-md">
          {item.description}
        </p>
      </div>

      {/* Right Side: Price & Button */}
      <div className="flex items-center gap-6 flex-shrink-0">
        <span className="text-base font-bold text-slate-50 tabular-nums">
          ${Number(item.Price || 0).toFixed(2)}
          {hasPriceAffectingOptions && <span className="text-xs font-normal text-slate-400 ml-0.5">+</span>}
        </span>
        
        <button 
          onClick={() => onSelect(item)}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all active:scale-95 border border-slate-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}