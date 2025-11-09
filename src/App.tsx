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

const stripePromise = loadStripe('pk_live_51LbmMgEqeptNz41b8FkXq1eH1xP8sKzP3b0d2a8CqDq7D0e8d3f6kX4f2h1c8w9c2f6j3b5e4a3s2d1f0g0hYt');

function MomotaroApp() {
  const { isLoading, error, categories } = useMenu();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [orderNote, setOrderNote] = useState('');
  
  // --- STRIPE STATE ---
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // --- CHATBOT LOADER ---
  useEffect(() => {
    // 1. Get the CloudFront URL from your config
    const CLOUDFRONT_URL = "https://d2ibqiw1xziqq9.cloudfront.net";

    // 2. Decide which config file to use based on the host
    let configFileName;
    if (window.location.origin.includes("dine-in")) {
      configFileName = "lex-web-ui-loader-config-dinein.json";
    } else if (window.location.origin.includes("take-out")) {
      configFileName = "lex-web-ui-loader-config-takeout.json";
    } else {
      console.warn("Chatbot: No matching config for this origin:", window.location.origin);
      // Default for local development
      configFileName = "lex-web-ui-loader-config-dinein.json"; 
    }

    // 3. Create the script tag to load the loader
    const script = document.createElement('script');
    script.src = `${CLOUDFRONT_URL}/lex-web-ui-loader.js`;
    script.async = true;

    // 4. When the script loads, initialize the chatbot
    script.onload = () => {
      if (window.ChatBotUiLoader) {
        // These options tell the loader where to find files
        const loaderOptions = {
          baseUrl: CLOUDFRONT_URL,
          configUrl: `${CLOUDFRONT_URL}/${configFileName}`
        };

        const iframeLoader = new window.ChatBotUiLoader.IframeLoader(loaderOptions);

        // This config object can override settings from the JSON files.
        // We set origins here for security.
        const chatbotUiConfig = {
          ui: {
            parentOrigin: window.location.origin
          },
          iframe: {
            iframeOrigin: CLOUDFRONT_URL
            // The iframeSrcPath will be loaded from your JSON config
          }
        };

        // 5. Load the iframe
        iframeLoader.load(chatbotUiConfig)
          .then(() => console.log('Chatbot UI loaded successfully.'))
          .catch((err) => console.error('Chatbot UI failed to load:', err));
      }
    };

    // 6. Add the script to the page and add a cleanup function
    document.body.appendChild(script);

    return () => {
      // Clean up the script when the component unmounts
      document.body.removeChild(script);
    };
  }, []); // The empty array ensures this runs only once
  // --- END CHATBOT LOADER ---

  useEffect(() => {
    if (categories.length > 0) {
      setActiveCategory(categories[0].name);
    }
  }, [categories]);

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

  const total = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  // --- STRIPE: Create PaymentIntent when cart changes ---
  useEffect(() => {
    if (total > 0) {
      // Create a PaymentIntent as soon as the cart has items
      axios.post('/.netlify/functions/create-payment-intent', {
        amount: Math.round(total * 100), // Convert to cents
        cart: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price }))
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
  }, [total, cart]); // Re-run when total or cart changes

  const handleOpenCheckout = () => {
    if (clientSecret) {
      setIsCheckoutModalOpen(true);
    } else {
      console.error("Checkout cannot be opened: No client secret");
      // Optionally show an error to the user
    }
  };

  const stripeOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'night',
      labels: 'floating',
      variables: {
        colorPrimary: '#10b981', // emerald-500
        colorBackground: '#1e293b', // slate-800
        colorText: '#f1f5f9', // slate-100
        colorDanger: '#f43f5e', // rose-500
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
          <Completion clientSecret={clientSecret} />
        </Elements>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      <Sidebar
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={handleScrollToCategory}
      />
      <main className="flex-1 overflow-y-auto scroll-smooth" onScroll={() => {
        // Find the category that is most visible
        let currentCategory = categories[0]?.name;
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
        setActiveCategory(currentCategory);
      }}>
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {isLoading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}
          {!isLoading && !error && (
            <div className="space-y-12">
              {categories.map((category) => (
                <MenuSection
                  key={category.name}
                  category={category}
                  onItemClick={setSelectedItem}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Cart
        cart={cart}
        setCart={setCart}
        total={total}
        orderNote={orderNote}
        setOrderNote={setOrderNote}
        onCheckout={handleOpenCheckout}
        canCheckout={!!clientSecret && total > 0}
      />

      {selectedItem && (
        <ItemOptionsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={(itemWithOptions) => {
            setCart(prevCart => {
              const uniqueId = nanoid();
              return [...prevCart, { ...itemWithOptions, cartItemId: uniqueId }];
            });
            setSelectedItem(null);
          }}
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
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <CheckoutForm cart={cart} total={total} orderNote={orderNote}/>
                </Elements>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
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