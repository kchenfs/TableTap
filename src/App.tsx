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
import { CartItem, MenuItem } from './types';
import ItemOptionsModal from './components/ItemOptionsModal';
import { X } from 'lucide-react';
import { nanoid } from 'nanoid';

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


const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_KEY) {
  console.error("⚠️ Stripe Publishable Key is missing. Check your Docker build args.");
}

// Pass the variable (or an empty string to prevent crash if missing)
const stripePromise = loadStripe(STRIPE_KEY || '');

let loaderScriptAdded = false;

function MomotaroApp() {
  const { isLoading, error, categories } = useMenu();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- APP MODE & CONFIGURATION ---
  const appMode = import.meta.env.VITE_APP_MODE || 'dine-in'; 
  const tableId = import.meta.env.VITE_TABLE_ID || 'table-1';

  // --- CART STATE ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [orderNote, setOrderNote] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // --- STRIPE STATE ---
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // --- CHATBOT LOADER ---
  useEffect(() => {
    if (loaderScriptAdded) return;
    const CLOUDFRONT_URL = "https://d2ibqiw1xziqq9.cloudfront.net";
    
    // 1. Determine which config file to use based on the URL
    let configFileName = "lex-web-ui-loader-config-dinein.json";
    
    // Check if we are on the take-out domain OR in take-out mode
    if (window.location.origin.includes("take-out") || appMode === 'takeout') {
      configFileName = "lex-web-ui-loader-config-takeout.json";
    }

    const script = document.createElement('script');
    script.src = `${CLOUDFRONT_URL}/lex-web-ui-loader.js`;
    script.async = true;

    script.onload = async () => {
      if (!window.ChatBotUiLoader) return;
      try {
        // 2. Manually fetch the correct config file
        const response = await fetch(`${CLOUDFRONT_URL}/${configFileName}`);
        if (!response.ok) throw new Error(`Failed to load config`);
        const configJson = await response.json();
        
        const loaderOptions = {
          baseUrl: CLOUDFRONT_URL,
          shouldLoadMinDeps: true,
          // ✅ CRITICAL FIX: This tells the library "I already have the config, don't look for the default file"
          shouldLoadConfigFromJsonFile: false, 
          config: configJson
        };

        const iframeLoader = new window.ChatBotUiLoader.IframeLoader(loaderOptions);
        const overrides = {
          ui: {
            parentOrigin: window.location.origin,
            toolbarTitle: "Momotaro",
            enableLogin: false,
            closeOnFulfillment: true,
          },
          iframe: {
            iframeOrigin: CLOUDFRONT_URL,
            iframeSrcPath: `/index.html#/?lexWebUiEmbed=true`,
            shouldLoadIframeMinimized: true
          },
          cognito: {
            poolId: configJson.cognito.poolId,
            region: configJson.cognito.region,
            providerName: "cognito-identity.amazonaws.com"

          }
        };
        iframeLoader.load(overrides).catch((err: any) => console.error("Chatbot load error:", err));
      } catch (err) {
        console.error("Chatbot config load error:", err);
      }
    };
    document.body.appendChild(script);
    loaderScriptAdded = true;
  }, []);

  // --- SET INITIAL CATEGORY ---
  useEffect(() => {
    if (categories && categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // --- FILTER LOGIC ---
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchTerm.trim()) return categories;
    const lowerTerm = searchTerm.toLowerCase();
    return categories.map(category => {
      const matchingItems = category.items.filter(item => 
        item.name.toLowerCase().includes(lowerTerm) || 
        item.description.toLowerCase().includes(lowerTerm)
      );
      return { ...category, items: matchingItems };
    }).filter(category => category.items.length > 0);
  }, [categories, searchTerm]);

  // --- SCROLL HANDLERS ---
  const handleScrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(categoryId);
    if (element) {
      const isMobile = window.innerWidth < 1024;
      const headerOffset = isMobile ? 180 : 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!categories) return;
    let currentCategory = activeCategory;
    let minDistance = Infinity;
    categories.forEach(category => {
      const element = document.getElementById(category.id);
      if (element) {
        const distance = Math.abs(element.getBoundingClientRect().top - 180);
        if (distance < minDistance) {
          minDistance = distance;
          currentCategory = category.id;
        }
      }
    });
    if (currentCategory) setActiveCategory(currentCategory);
  };

  // --- CART ACTIONS ---
  const handleAddToCart = (itemWithOptions: CartItem) => {
    setCart(prev => [...prev, itemWithOptions]);
    setSelectedItem(null);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (cartId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev =>
      prev.map(item => item.cartId === cartId ? { ...item, quantity } : item)
    );
  };

  const handleRemoveItem = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const total = useMemo(() => {
    return (cart || []).reduce((acc, item) => acc + item.finalPrice * item.quantity, 0);
  }, [cart]);


  // --- STRIPE INTENT (TAKE-OUT LOGIC) ---
  useEffect(() => {
    if (appMode === 'takeout' && total > 0) {
      const PAYMENT_API_URL = import.meta.env.VITE_PAYMENT_API_URL || "https://097zxtivqd.execute-api.ca-central-1.amazonaws.com/PROD/create-payment-intent";

      axios.post(PAYMENT_API_URL, {
        amount: Math.round(total * 100),
        cart: cart.map(item => ({
          id: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.finalPrice,
          // ✅ FIX: Send selected options so backend can calculate add-on prices
          selectedOptions: item.selectedOptions 
        })),
      })
      .then(res => setClientSecret(res.data.clientSecret))
      .catch(err => console.error("Intent error:", err));
    } else {
      setClientSecret(null);
    }
  }, [total, cart, appMode]); 

  // --- CHECKOUT BUTTON CLICK HANDLER ---
  const handleCheckout = async () => {
    setIsCheckingOut(true);

    if (appMode === 'takeout') {
      if (clientSecret) {
        setIsCheckoutModalOpen(true);
        setIsCartOpen(false);
      } else {
        console.warn("Client secret not ready yet");
      }
      setIsCheckingOut(false);
    } 
    else {
      // --- DINE-IN LOGIC ---
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
      } finally {
        setIsCheckingOut(false);
      }
    }
  };

  const stripeOptions: StripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: 'night',
      labels: 'floating',
      variables: { colorPrimary: '#10b981', colorBackground: '#1e293b', colorText: '#f1f5f9' }
    }
  };

  if (clientSecret && window.location.search.includes('payment_intent')) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Elements stripe={stripePromise} options={stripeOptions}>
          <Completion />
        </Elements>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Header cart={cart} onCartClick={() => setIsCartOpen(true)} />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        <Sidebar
          categories={categories || []}
          activeCategory={activeCategory}
          onCategoryClick={handleScrollToCategory}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <main className="flex-1 px-4 pb-20 lg:px-8" onScroll={handleScroll}>
          {appMode === 'dine-in' && (
            <div className="hidden lg:block py-6 border-b border-slate-800 mb-6">
              <h1 className="text-3xl font-bold text-white">
                Welcome to Table {tableId?.replace('table-', '')}
              </h1>
            </div>
          )}

          {isLoading && <LoadingSpinner />}
          {error && <ErrorMessage error={error instanceof Error ? error : new Error('Unknown error')} />}

          {!isLoading && !error && (
            <div className="space-y-12 lg:pt-0 pt-4"> 
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category, index) => (
                  <MenuSection
                    key={category.id}
                    category={category}
                    onItemSelect={setSelectedItem}
                    delay={index * 100}
                  />
                ))
              ) : (
                <div className="text-slate-400 text-center py-12">
                  <p className="text-lg">No items found matching "{searchTerm}"</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut} 
        orderNote={orderNote}
        onNoteChange={setOrderNote}
        checkoutButtonText={appMode === 'takeout' ? 'Proceed to Checkout' : 'Send to Kitchen'}
      />

      {selectedItem && (
        <ItemOptionsModal
          isOpen={!!selectedItem}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {isCheckoutModalOpen && clientSecret && appMode === 'takeout' && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsCheckoutModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-slate-900 rounded-lg shadow-xl flex flex-col max-h-[90vh]">
              <div className="flex-shrink-0 p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-50">Payment Details</h2>
                <button onClick={() => setIsCheckoutModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto">
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <CheckoutForm cart={cart} total={total} orderNote={orderNote} />
                </Elements>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MenuProvider>
        <MomotaroApp />
      </MenuProvider>
    </QueryClientProvider>
  );
}

export default App;