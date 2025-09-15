// File: MenuContext.tsx

import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { APIMenuItem } from './types'; // Assuming your types file is here

// This is the corrected data fetching function
const fetchMenu = async (): Promise<APIMenuItem[]> => {
  const response = await fetch('https://097zxtivqd.execute-api.ca-central-1.amazonaws.com/PROD/getMenuItem');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  // This gets the outer object, e.g., { statusCode: 200, body: "..." }
  const data = await response.json();

  // First, access the 'body' property. Then, parse the string inside it.
  if (data && data.body) {
    const parsedBody = JSON.parse(data.body);
    return parsedBody || [];
  }
  
  // Return an empty array if there's no body, preventing crashes
  return [];
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