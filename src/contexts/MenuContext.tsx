// File: MenuContext.tsx

import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { APIMenuItem } from './types'; // Assuming your types file is here

// This is the corrected data fetching function
const fetchMenu = async (): Promise<APIMenuItem[]> => {
  // === THIS IS THE MODIFIED PART ===
  const apiUrl = import.meta.env.VITE_API_GATEWAY_URL;

  // Best practice: Add a check to ensure the variable is loaded.
  if (!apiUrl) {
    throw new Error('VITE_API_GATEWAY_URL is not defined. Please check your .env file.');
  }

  const response = await fetch(apiUrl);
  // ===============================

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const data = await response.json();
  return data || [];
};

// --- No other changes are needed below this line ---

const MenuContext = createContext<any>(null);

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, ...rest } = useQuery<APIMenuItem[]>({
    queryKey: ['menuItems'],
    queryFn: fetchMenu,
  });

  const value = { MenuItems: data ?? [], ...rest };

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};