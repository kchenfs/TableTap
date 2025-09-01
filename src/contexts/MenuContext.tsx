import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { APIMenuItem } from '../types';

const API_URL_MENU = 'https://097zxtivqd.execute-api.ca-central-1.amazonaws.com/PROD/getMenuItem';

interface MenuContextType {
  MenuItems: APIMenuItem[];
  isError: boolean;
  isPending: boolean;
  error: Error | null;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};

interface MenuProviderProps {
  children: React.ReactNode;
}

const MenuProvider: React.FC<MenuProviderProps> = ({ children }) => {
  const {
    data: MenuItems = [],
    isError,
    isPending,
    error,
  } = useQuery({
    queryKey: ['menuItems'],
    queryFn: async () => {
      const response = await fetch(API_URL_MENU);
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      return JSON.parse(data.body);
    },
  });

  return (
    <MenuContext.Provider value={{ MenuItems, isError, isPending, error }}>
      {children}
    </MenuContext.Provider>
  );
};

export default MenuProvider;