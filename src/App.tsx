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

const stripePromise = loadStripe('pk_live_51LbmMgEqeptNz41b8FkXq1eH1xP8sKzP3b0d2a8CqDq7D0e8d3f6kX4f2h1c8w9c2f6j3b5e4a3s2d1f0g0hYt');

// This flag is to prevent React 18 strict mode from running the effect twice
let loaderScriptAdded = false;

function MomotaroApp() {
  const { isLoading, error, categories } = useMenu();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // --- CART STATE ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [orderNote, setOrderNote] = useState('');
  
  // --- STRIPE STATE ---
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // --- DEBUG LOGGING ---
  useEffect(() => {
    if (categories?.length > 0) {
      // console.log('Menu loaded, categories:', categories.length);
    }
  }, [categories]);

  // --- CHATBOT LOADER (FIXED) ---
  useEffect(() => {
    if (loaderScriptAdded) {
      return;
    }

    const CLOUDFRONT_URL = "https://d2ibqiw1xziqq9.cloudfront.net";

    let configFileName;
    if (window.location.origin.includes("dine-in")) {
      configFileName = "lex-web-ui-loader-config-dinein.json";
    } else if (window.location.origin.includes("take-out")) {
      configFileName = "lex-web-ui-loader-config-takeout.json";
    } else {
      console.warn("Chatbot: No matching config for this origin:", window.location.origin);
      configFileName = "lex-web-ui-loader-config-dinein.json"; // Default fallback
    }

    const script = document.createElement('script');
    script.src = `${CLOUDFRONT_URL}/lex-web-ui-loader.js`;
    script.async = true;

    script.onload = async () => {
      if (window.ChatBotUiLoader) {
        console.log("✓ ChatBotUiLoader available, fetching config manually...");
        
        try {
          // 1. Manually fetch the correct config file first
          // This ensures we get the specific file we want (dine-in or take-out)
          // instead of the loader trying to guess and failing with 403.
          const configUrl = `${CLOUDFRONT_URL}/${configFileName}`;
          const response = await fetch(configUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to load config from ${configUrl}: ${response.status} ${response.statusText}`);
          }
          
          const configJson = await response.json();
          console.log("✓ Config loaded manually:", configFileName);

          // 2. Pass the fetched 'config' object directly to loaderOptions
          const loaderOptions = {
            baseUrl: CLOUDFRONT_URL,
            shouldLoadMinDeps: true,
            config: configJson // <--- Vital fix: Pass the object here
            configUrl: null,
            configPath: null
          };

          const iframeLoader = new window.ChatBotUiLoader.IframeLoader(loaderOptions);

          const chatbotUiConfigOverrides = {
            ui: {
              parentOrigin: window.location.origin,
              toolbarTitle: "Momotaro",
              toolbarLogo: "",
              enableLogin: false,
              closeOnFulfillment: true,
              baseUrl: CLOUDFRONT_URL
            },
            iframe: {
              iframeOrigin: CLOUDFRONT_URL,
              iframeSrcPath: `/index.html#/?lexWebUiEmbed=true`,
              shouldLoadIframeMinimized: true
            }
          };

          iframeLoader.load(chatbotUiConfigOverrides)
            .then(() => console.log('✅ Chatbot UI loaded successfully.'))
            .catch((err: any) => console.error('❌ Chatbot UI failed to load:', err));

        } catch (error) {
          console.error("❌ Error initializing chatbot:", error);
        }

      } else {
        console.error("❌ ChatBotUiLoader object not found on window.");
      }
    };
    
    script.onerror = () => {
      console.error("❌ Failed to load the lex-web-ui-loader.js script.");
    };

    document.body.appendChild(script);
    loaderScriptAdded = true;

  }, []);
  // --- END CHATBOT LOADER ---


  // Set initial active category
  useEffect(() => {
    if (categories && categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }
  }, [categories, activeCategory]);

  const handleScrollToCategory = (categoryName: string) => {
    setActiveCategory(categoryName);
    const element = document.getElementById(categoryName);
    if (element) {
      const headerOffset = 64; // 4rem * 16px/rem = 64px
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // --- CART HANDLERS ---
  const handleAddToCart = (itemWithOptions: CartItem) => {
    setCart(prevCart => [...prevCart, itemWithOptions]);
    setSelectedItem(null);
    setIsCartOpen(true); // Open cart when item is added
  };

  const handleUpdateQuantity = (cartId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(item => 
      item.cartId === cartId ? { ...item, quantity } : item
    ));
  };

  const handleRemoveItem = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const total = useMemo(() => {
    return (cart || []).reduce((acc, item) => acc + item.finalPrice * item.quantity, 0);
  }, [cart]);

  // --- STRIPE: Create PaymentIntent when cart changes ---
  useEffect(() => {
    if (total > 0) {
      axios.post('/.netlify/functions/create-payment-intent', {
        amount: Math.round(total * 100), // Convert to cents
        cart: cart.map(item => ({ 
          id: item.menuItem.id, 
          name: item.menuItem.name, 
          quantity: item.quantity, 
          price: item.finalPrice 
        }))
      })
      .then(res => {
        setClientSecret(res.data.clientSecret);
      })
      .catch(error => {
        console.error("Error creating PaymentIntent:", error);
      });
    } else {
      setClientSecret(null);
    }
  }, [total, cart]);

  const handleOpenCheckout = async () => {
    if (clientSecret) {
      setIsCheckoutModalOpen(true);
      setIsCartOpen(false);
    } else {
      console.error("Checkout cannot be opened: No client secret");
    }
  };

  const stripeOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'night',
      labels: 'floating',
      variables: {
        colorPrimary: '#10b981',
        colorBackground: '#1e293b',
        colorText: '#f1f5f9',
        colorDanger: '#f43f5e',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '4px',
      }
    },
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
    <div className="flex h-screen bg-slate-900 text-slate-100">
      <Sidebar
        categories={categories || []}
        activeCategory={activeCategory || ''}
        onCategoryClick={handleScrollToCategory}
        searchTerm=""
        onSearchChange={() => {}}
      />
      
      <main className="flex-1 overflow-y-auto scroll-smooth" onScroll={() => {
        if (!categories) return;
        let currentCategory = activeCategory;
        let minDistance = Infinity;

        categories.forEach(category => {
          const element = document.getElementById(category.name);
          if (element) {
            const distance = Math.abs(element.getBoundingClientRect().top - 64);
            if (distance < minDistance) {
              minDistance = distance;
              currentCategory = category.name;
            }
          }
        });
        if (currentCategory) setActiveCategory(currentCategory);
      }}>
        <Header 
          cart={cart} 
          onCartClick={() => setIsCartOpen(true)} 
        />
        
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {isLoading && <LoadingSpinner />}
          {error && <ErrorMessage error={error instanceof Error ? error : new Error('Unknown error')} />}
          {!isLoading && !error && (
            <div className="space-y-12">
              {categories && categories.length > 0 ? (
                categories.map((category) => (
                  <MenuSection
                    key={category.name}
                    category={category}
                    onItemSelect={setSelectedItem}
                    delay={0}
                  />
                ))
              ) : (
                <div className="text-slate-400 text-center py-8">
                  No menu items available
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleOpenCheckout}
        orderNote={orderNote}
        onNoteChange={setOrderNote}
        checkoutButtonText="Proceed to Checkout"
      />

      {selectedItem && (
        <ItemOptionsModal
          isOpen={!!selectedItem}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}
      
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
                {/* Safely render Elements only if clientSecret exists */}
                {clientSecret && (
                  <Elements stripe={stripePromise} options={stripeOptions}>
                    <CheckoutForm cart={cart} total={total} orderNote={orderNote}/>
                  </Elements>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        main::-webkit-scrollbar {
          display: none;
        }

        /* Hide scrollbar for IE, Edge and Firefox */
        main {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
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