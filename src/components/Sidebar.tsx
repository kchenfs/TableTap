import React from 'react';
import { Search } from 'lucide-react';
import { MenuCategory } from '../types';

interface SidebarProps {
  categories: MenuCategory[];
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  activeCategory: string | null;
  onCategoryClick: (categoryId: string) => void;
}

export default function Sidebar({ 
  categories = [], 
  searchTerm = '', 
  onSearchChange = () => {}, 
  activeCategory, 
  onCategoryClick 
}: SidebarProps) {
  
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    // Sticky positioning added here for Mobile (top-16 accounts for Header height)
    // On Desktop (lg), it sticks at top-24 to give some breathing room
    <aside className="sticky top-16 z-30 bg-slate-900 lg:top-24 lg:col-span-3 lg:w-64 lg:flex-shrink-0 lg:pt-6 pb-4 lg:pb-0 shadow-xl lg:shadow-none border-b border-slate-800 lg:border-b-0 px-4 lg:px-0">
      
      {/* Search Bar */}
      <div className="relative mb-4 lg:mb-6 pt-4 lg:pt-0">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 pt-4 lg:pt-0">
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
      <div className="lg:hidden">
        <div className="category-scrollbar -mx-4 overflow-x-auto px-4 pb-2">
          <nav className="flex space-x-2">
            {safeCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-slate-800 text-slate-50 ring-1 ring-slate-700'
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
      <nav className="hidden lg:block overflow-y-auto max-h-[calc(100vh-200px)] pr-2 custom-scrollbar">
        <h3 className="text-sm font-semibold text-slate-50 tracking-tight mb-3">Categories</h3>
        <ul className="space-y-1">
          {safeCategories.map((category) => (
            <li key={category.id}>
              <button
                onClick={() => onCategoryClick(category.id)}
                className={`w-full text-left block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'text-slate-50 bg-slate-800 border-l-2 border-sky-500'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-50 border-l-2 border-transparent'
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