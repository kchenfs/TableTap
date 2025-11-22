import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { APIMenuItem, MenuCategory } from '../types'; 
import { organizeMenuByCategory } from '../menuUtils'; // <--- 1. Import this

const fetchMenu = async (): Promise<APIMenuItem[]> => {
  const apiUrl = import.meta.env.VITE_API_URL_MENU;

  if (!apiUrl) {
    throw new Error('VITE_API_URL_MENU is not defined.');
  }

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const data = await response.json();
  return data || [];
};

// Define the shape of your context clearly
interface MenuContextType {
  isLoading: boolean;
  error: unknown;
  categories: MenuCategory[];
  MenuItems: APIMenuItem[];
  refetch: () => void;
}

const MenuContext = createContext<MenuContextType | null>(null);

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, error, refetch } = useQuery<APIMenuItem[]>({
    queryKey: ['menuItems'],
    queryFn: fetchMenu,
  });

  // 2. Calculate categories using your utility function
  const categories = useMemo(() => {
    if (!data) return [];
    return organizeMenuByCategory(data);
  }, [data]);

  // 3. Include 'categories' in the value object
  const value = { 
    isLoading,
    error,
    categories, // <--- App.tsx looks for this!
    MenuItems: data ?? [], 
    refetch 
  };

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};