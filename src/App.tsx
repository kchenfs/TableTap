import React, { useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MenuSection from './components/MenuSection';
import Cart from './components/Cart';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import MenuProvider, { useMenu } from './contexts/MenuContext';
import { organizeMenuByCategory } from './utils/menuUtils';
import { CartItem, MenuItem } from './types';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function MenuApp() {
  const { MenuItems, isError, isPending, error } = useMenu();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Organize menu items by category
  const menuCategories = useMemo(() => {
    return organizeMenuByCategory(MenuItems);
  }, [MenuItems]);

  // Set initial active category when data loads
  React.useEffect(() => {
    if (menuCategories.length > 0 && !activeCategory) {
      setActiveCategory(menuCategories[0].id);
    }
  }, [menuCategories, activeCategory]);

  // Filter menu data based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return menuCategories;
    
    return menuCategories.map(category => ({
      ...category,
      items: category.items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(category => category.items.length > 0);
  }, [searchTerm, menuCategories]);

  const addToCart = (item: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(categoryId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Add this checkout handler function
  const handleCheckout = async (cartItems: CartItem[], total: number) => {
    setIsCheckingOut(true);
    
    try {
      const apiKey = process.env.REACT_APP_API_KEY;
      const sendOrderUrl = process.env.REACT_APP_SEND_ORDER_URL;
      const saveOrderUrl = process.env.REACT_APP_SAVE_ORDER_URL;

      if (!apiKey) {
        throw new Error('API_KEY is not defined in environment variables');
      }
      if (!sendOrderUrl) {
        throw new Error('SEND_ORDER_URL is not defined in environment variables');
      }
      if (!saveOrderUrl) {
        throw new Error('SAVE_ORDER_URL is not defined in environment variables');
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      };

      // Format the order data
      const orderData = {
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
          location: item.location,
        })),
        total: total,
        orderDate: new Date().toISOString(),
        orderNumber: `ORD-${Date.now()}`,
        notes: orderNote || '',
      };

      console.log('Sending order data:', orderData);

      // Call both API endpoints simultaneously
      const [sendOrderResponse, saveOrderResponse] = await Promise.all([
        axios.post(
          sendOrderUrl,
          orderData,
          { headers }
        ),
        axios.post(
          saveOrderUrl,
          orderData,
          { headers }
        )
      ]);
      
      console.log('Send Order Response:', sendOrderResponse.data);
      console.log('Save Order Response:', saveOrderResponse.data);
      console.log('Send Order Response:', sendOrderResponse);
      console.log('Save Order Response:', saveOrderResponse);
      
      // Handle successful checkout
      setCart([]); // Clear the cart
      setIsCartOpen(false); // Close the cart
      setOrderNote('');  // Add this line to reset the note
      
      alert('Order placed successfully! Thank you for your order.');
      
    } catch (error) {
      console.error('Checkout failed:', error);
      
      // More detailed error handling
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        alert(`Checkout failed: ${error.response.data?.message || 'Server error'}`);
      } else if (error.request) {
        alert('Network error. Please check your connection and try again.');
      } else {
        alert('Checkout failed. Please try again.');
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-300 antialiased">
        <Header cart={cart} onCartClick={() => setIsCartOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-300 antialiased">
        <Header cart={cart} onCartClick={() => setIsCartOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <ErrorMessage 
            error={error} 
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['menuItems'] })} 
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 antialiased">
      <Header cart={cart} onCartClick={() => setIsCartOpen(true)} />
      
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <Sidebar 
            categories={menuCategories}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeCategory={activeCategory}
            onCategoryClick={scrollToCategory}
          />
          
          <div className="lg:col-span-9 mt-8 lg:mt-0">
            <div className="space-y-12">
              {filteredCategories.map((category, index) => (
                <MenuSection 
                  key={category.id}
                  category={category}
                  onAddToCart={addToCart}
                  delay={(index + 2) * 100}
                />
              ))}
              
              {filteredCategories.length === 0 && searchTerm && (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-lg">No items found matching "{searchTerm}"</p>
                </div>
              )}

              {filteredCategories.length === 0 && !searchTerm && MenuItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-lg">No menu items available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Cart 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
        orderNote={orderNote}
        onNoteChange={setOrderNote}
      />

      <style jsx>{`
        @import url('https://rsms.me/inter/inter.css');
        html { 
          font-family: 'Inter', sans-serif; 
          scroll-behavior: smooth;
        }
        @supports (font-variation-settings: normal) {
          html { font-family: 'Inter var', sans-serif; }
        }

        @keyframes slide-in-fade {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slide-in-fade {
          animation: slide-in-fade 0.6s ease-out forwards;
          animation-delay: var(--delay, 0ms);
          opacity: 0;
        }

        .category-scrollbar::-webkit-scrollbar { height: 4px; }
        .category-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .category-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }
        .category-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MenuProvider>
        <MenuApp />
      </MenuProvider>
    </QueryClientProvider>
  );
}

export default App;