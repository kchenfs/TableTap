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
import ItemOptionsModal from './components/ItemOptionsModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
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

  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const menuCategories = useMemo(() => organizeMenuByCategory(MenuItems), [MenuItems]);

  React.useEffect(() => {
    if (menuCategories.length > 0 && !activeCategory) {
      setActiveCategory(menuCategories[0].id);
    }
  }, [menuCategories, activeCategory]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return menuCategories;
    return menuCategories.map(category => ({
      ...category,
      items: category.items.filter(item => 
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(category => category.items.length > 0);
  }, [searchTerm, menuCategories]);

  const handleItemSelect = (item: MenuItem) => {
    if (item.options && item.options.length > 0) {
      setSelectedItem(item);
      setIsOptionsModalOpen(true);
    } else {
      const simpleCartItem: CartItem = {
        cartId: item.id,
        menuItem: item,
        selectedOptions: {},
        quantity: 1,
        finalPrice: item.Price,
      };
      addToCart(simpleCartItem);
    }
  };

  const addToCart = (itemToAdd: CartItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.cartId === itemToAdd.cartId);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.cartId === itemToAdd.cartId
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...itemToAdd, quantity: 1 }];
    });
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.cartId === cartId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
  };

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    document.getElementById(categoryId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  const handleCheckout = async (cartItems: CartItem[], total: number) => {
    setIsCheckingOut(true);
    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      const sendOrderUrl = import.meta.env.VITE_SEND_ORDER_URL;
      const saveOrderUrl = import.meta.env.VITE_SAVE_ORDER_URL;
      const headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey };
      
      const orderData = {
        items: cartItems.map(item => ({
          id: item.menuItem.id,
          name: item.menuItem.name,
          price: item.finalPrice,
          quantity: item.quantity,
          subtotal: item.finalPrice * item.quantity,
          location: item.menuItem.location,
          options: Object.entries(item.selectedOptions).map(([group, option]) => 
            `${group}: ${option.name}`
          ).join('; ')
        })),
        total,
        orderDate: new Date().toISOString(),
        orderNumber: `ORD-${Date.now()}`,
        notes: orderNote || '',
      };
      
      await Promise.all([
        axios.post(sendOrderUrl, orderData, { headers }),
        axios.post(saveOrderUrl, orderData, { headers })
      ]);
      
      setCart([]);
      setIsCartOpen(false);
      setOrderNote('');
      alert('Order placed successfully!');
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };
  
  if (isPending) return <div className="min-h-screen bg-slate-900"><LoadingSpinner /></div>;
  if (isError) return <div className="min-h-screen bg-slate-900"><ErrorMessage error={error} /></div>;

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
                  onItemSelect={handleItemSelect}
                  delay={(index + 2) * 100}
                />
              ))}
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

      <ItemOptionsModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        item={selectedItem}
        onAddToCart={addToCart}
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

