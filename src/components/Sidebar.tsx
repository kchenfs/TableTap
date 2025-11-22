import React from 'react';
import { Search } from 'lucide-react';
import { MenuCategory } from '../types';

interface SidebarProps {
  categories: MenuCategory[];
  searchTerm?: string; // Made optional to prevent errors if missing
  onSearchChange?: (term: string) => void;
  activeCategory: string | null; // Allow null
  onCategoryClick: (categoryId: string) => void;
}

export default function Sidebar({ 
  categories = [], // <--- DEFAULT VALUE prevents 'map' undefined error
  searchTerm = '', 
  onSearchChange = () => {}, 
  activeCategory, 
  onCategoryClick 
}: SidebarProps) {
  
  // Safety check: ensure categories is actually an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <aside className="lg:col-span-3 lg:sticky lg:top-24 h-fit animate-slide-in-fade" style={{ '--delay': '100ms' } as any}>
      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
        </div>
        <input 
          type="search" 
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full rounded-lg border-0 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-50 ring-1 ring-slate-100/10 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-400 transition"
        />
      </div>

      {/* Mobile Category Scroller */}
      <div className="mb-8 lg:hidden">
        <div className="category-scrollbar -mx-4 sm:-mx-6 overflow-x-auto px-4 sm:px-6">
          <nav className="flex space-x-2 border-b border-slate-800 pb-4">
            {/* Use safeCategories here */}
            {safeCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-slate-800 text-slate-50'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop Category List */}
      <nav className="hidden lg:block">
        <h3 className="text-sm font-semibold text-slate-50 tracking-tight mb-3">Categories</h3>
        <ul className="space-y-1">
          {/* Use safeCategories here */}
          {safeCategories.map((category) => (
            <li key={category.id}>
              <button
                onClick={() => onCategoryClick(category.id)}
                className={`w-full text-left block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'text-slate-50 bg-slate-800'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-50'
                }`}
              >
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}