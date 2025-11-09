import React, { useState, useMemo, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MenuSection from './components/MenuSection';
import Cart from './components/Cart';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import { MenuProvider, useMenu } from './contexts/MenuContext';
import { organizeMenuByCategory } from './utils/menuUtils';
import { CartItem, MenuItem } from './types';
import ItemOptionsModal from './components/ItemOptionsModal';
import { nanoid } from 'nanoid';
import { X } from 'lucide-react';

// --- STRIPE IMPORTS ---
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './components/CheckoutForm';
import Completion from './components/Completion';

declare global {
  interface Window {
    ChatBotUiLoader: any;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const stripePromise = loadStripe('pk_live_51LbmMgEqeptNz41bIEu1GF3KnNZdo1bJQ1yQ4ClMOLbfHbUj56bJZcPvUTKyWLL5il9qLWHHXu1mFjeSKmAXeHGI00DZsghsLM');

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

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const appMode = import.meta.env.VITE_APP_MODE || 'dine-in';
  const tableId = import.meta.env.VITE_TABLE_ID;

  useEffect(() => {
    const initChatbot = () => {
      if (window.ChatBotUiLoader) {
        console.log('✓ ChatBotUiLoader available, initializing...');

        // Determine config file based on app mode
        const configFileName = appMode === 'takeout' 
          ? 'lex-web-ui-loader-config-takeout.json'
          : 'lex-web-ui-loader-config-dinein.json';
        
        const loaderOptions = {
          shouldLoadConfigFromJsonFile: true,
          baseUrl: 'https://d2ibqiw1xziqq9.cloudfront.net',
          configUrl: `https://d2ibqiw1xziqq9.cloudfront.net/${configFileName}`,
          elementId: 'lex-web-ui' // Explicitly set the container element ID
        };

        console.log(`Loading chatbot config from: ${loaderOptions.configUrl}`);

        try {
          const iframeLoader = new window.ChatBotUiLoader.IframeLoader(loaderOptions);
          
          iframeLoader.load()
            .then(() => {
              console.log('✅ Chatbot loaded successfully!');
            })
            .catch((error) => {
              console.error('❌ Chatbot failed to load:', error);
              console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                loaderOptions
              });
            });
        } catch (error) {
          console.error('❌ Error creating IframeLoader:', error);
        }
      } else {
        console.warn('ChatBotUiLoader not available yet, retrying in 100ms...');
        setTimeout(initChatbot, 100);
      }
    };

    // Start initialization after a short delay to ensure script is loaded
    const timeoutId = setTimeout(initChatbot, 500);
    return () => clearTimeout(timeoutId);
  }, [appMode]);

  const menuCategories = useMemo(() => organizeMenuByCategory(MenuItems), [MenuItems]);
  const total = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    return subtotal * 1.13; // 13% tax
  }, [cart]);

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

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    if (appMode === 'takeout') {
      setIsCheckoutModalOpen(true);
    } else {
      try {
        const apiKey = import.meta.env.VITE_API_KEY;
        const TableTapUrl = import.meta.env.VITE_TABLE_TAP_URL;
        const headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey };

        const orderData = {
          items: cart.map(item => ({
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
          order_id: nanoid(5).toUpperCase(),
          notes: orderNote || '',
          table: tableId,
          orderType: appMode,
        };

        await axios.post(TableTapUrl, orderData, { headers });

        setCart([]);
        setIsCartOpen(false);
        setOrderNote('');
        alert('Order sent to the kitchen!');
      } catch (error) {
        console.error('Checkout failed:', error);
        alert('Failed to send order. Please show your cart to the staff.');
      }
    }
    setIsCheckingOut(false);
  };

  const appearanceOptions = {
    theme: 'night',
    variables: {
      colorPrimary: '#0ea5e9',
      colorBackground: '#1e2b3b',
      colorText: '#f8fafc',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '0.5rem',
    },
     rules: {
      '.Input': {
        backgroundColor: '#334155',
        borderColor: '#475569'
      },
       '.Tab': {
        backgroundColor: '#334155',
         borderColor: '#475569'
      },
      '.Tab:hover': {
        backgroundColor: '#475569',
      },
      '.Tab--selected': {
        backgroundColor: '#0ea5e9',
        color: '#ffffff',
      },
    }
  };

  const stripeOptions: StripeElementsOptions = {
    mode: 'payment',
    amount: Math.round(total * 100),
    currency: 'cad',
    appearance: appearanceOptions,
  };

  if (window.location.pathname === '/completion') {
    return (
      <Elements stripe={stripePromise} options={{}}>
        <Completion />
      </Elements>
    );
  }

  if (isPending) return <div className="min-h-screen bg-slate-900"><LoadingSpinner /></div>;
  if (isError) return <div className="min-h-screen bg-slate-900"><ErrorMessage error={error} /></div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 antialiased">
      <Header cart={cart} onCartClick={() => setIsCartOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {appMode === 'dine-in' && (
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-8 animate-slide-in-fade">
            Welcome to Table {tableId?.replace('table-', '')}
          </h1>
        )}
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
        checkoutButtonText={appMode === 'takeout' ? 'Proceed to Payment' : 'Send to Kitchen'}
      />

      <ItemOptionsModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        item={selectedItem}
        onAddToCart={addToCart}
      />

      {isCheckoutModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsCheckoutModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-slate-900 rounded-lg shadow-xl flex flex-col max-h-[90vh]">
              <div className="flex-shrink-0 p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-50">Enter Payment Details</h2>
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors z-10"
                >
                  <X className="h-5 w-5"/>
                </button>
              </div>
              <div className="flex-grow overflow-y-auto">
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <CheckoutForm cart={cart} total={total} orderNote={orderNote}/>
                </Elements>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        /* ... styles remain the same ... */
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