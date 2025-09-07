import React from 'react';
import MenuItem from './MenuItem';
import { MenuCategory, MenuItem as MenuItemType } from '../types';

interface MenuSectionProps {
  category: MenuCategory;
  onItemSelect: (item: MenuItemType) => void;
  delay: number;
}

export default function MenuSection({ category, onItemSelect, delay }: MenuSectionProps) {
  return (
    <section 
      id={category.id} 
      className="animate-slide-in-fade" 
      style={{ '--delay': `${delay}ms` } as React.CSSProperties}
    >
      <h2 className="text-2xl font-semibold tracking-tight text-slate-50 border-b border-slate-800 pb-4">
        {category.name}
      </h2>
      <div className="mt-6 divide-y divide-slate-800">
        {category.items.map((item) => (
          <MenuItem 
            key={item.id} 
            item={item} 
            onSelect={onItemSelect}
          />
        ))}
      </div>
    </section>
  );
}

