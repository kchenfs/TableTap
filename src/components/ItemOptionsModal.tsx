import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { MenuItem, OptionGroup, OptionItem, CartItem } from '../types';

interface ItemOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  onAddToCart: (customizedItem: CartItem) => void;
}

const ItemOptionsModal: React.FC<ItemOptionsModalProps> = ({ isOpen, onClose, item, onAddToCart }) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, OptionItem>>({});

  // Reset state and set defaults when a new item is opened in the modal
  useEffect(() => {
    if (item?.options) {
      const defaults: Record<string, OptionItem> = {};
      item.options.forEach(group => {
        if (group.required && group.items.length > 0) {
          defaults[group.name] = group.items[0]; // Auto-select the first option for required groups
        }
      });
      setSelectedOptions(defaults);
    } else {
      setSelectedOptions({});
    }
  }, [item]);

  // Calculate the final price in real-time
  const finalPrice = useMemo(() => {
    if (!item) return 0;
    // Start with the base price of the item.
    // For the Veggie Roll Set, this is the price of Set A (15.99)
    let price = item.Price;
  
    // In your new structure, the selected option's priceModifier adjusts the base price.
    // So, if Set B is selected, its modifier (-3.00) is added to the base price.
    // 15.99 + (-3.00) = 12.99.
    const optionsPrice = Object.values(selectedOptions).reduce(
      (total, option) => total + (option?.priceModifier || 0),
      0
    );
    return price + optionsPrice;
  }, [item, selectedOptions]);
  
  if (!isOpen || !item) return null;

  // Handle user selections for variants (radio) and add-ons (checkbox)
  const handleOptionChange = (group: OptionGroup, optionItem: OptionItem) => {
    setSelectedOptions(prev => {
      const newSelections = { ...prev };
      if (group.type === 'ADD_ON' && newSelections[group.name]?.name === optionItem.name) {
        delete newSelections[group.name]; // Toggle off for checkboxes
      } else {
        newSelections[group.name] = optionItem;
      }
      return newSelections;
    });
  };
  
  // Create the final customized cart item object
  const handleAddToCartClick = () => {
    const customizedItem: CartItem = {
      cartId: `${item.id}-${JSON.stringify(selectedOptions)}-${Date.now()}`,
      menuItem: item,
      selectedOptions,
      quantity: 1,
      finalPrice,
    };
    onAddToCart(customizedItem);
    onClose();
  };
  
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-slate-900 rounded-lg shadow-xl animate-scale-up">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-slate-50">{item.name}</h2>
            <p className="text-slate-400 mt-2">{item.description}</p>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors">
              <X className="h-5 w-5"/>
            </button>
          </div>
          
          <div className="p-6 border-t border-b border-slate-800 max-h-[50vh] overflow-y-auto">
            {item.options?.map(group => (
              <div key={group.name} className="mb-6">
                <div className='flex justify-between items-center'>
                    <h3 className="text-lg font-medium text-slate-200">{group.name}</h3>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${group.required ? 'bg-red-900/50 text-red-300' : 'bg-sky-900/50 text-sky-300'}`}>
                        {group.required ? 'Required' : 'Optional'}
                    </span>
                </div>
                <div className="mt-4 space-y-3">
                  {group.items.map(optionItem => (
                    <label key={optionItem.name} className={`flex items-start justify-between p-4 rounded-lg bg-slate-800 cursor-pointer border-2 transition-colors ${selectedOptions[group.name]?.name === optionItem.name ? 'border-sky-500' : 'border-transparent'}`}>
                      <div className="pr-4">
                        <div className="flex items-center">
                          <span className="font-medium text-slate-100">{optionItem.name}</span>
                          {optionItem.priceModifier !== 0 && (
                            <span className="text-slate-400 ml-2">({optionItem.priceModifier > 0 ? '+' : ''}${optionItem.priceModifier.toFixed(2)})</span>
                          )}
                        </div>
                        {optionItem.description && (
                          <p className="text-sm text-slate-400 mt-1">{optionItem.description}</p>
                        )}
                      </div>
                      <input
                        type={group.type === 'VARIANT' ? 'radio' : 'checkbox'}
                        name={group.name}
                        checked={selectedOptions[group.name]?.name === optionItem.name}
                        onChange={() => handleOptionChange(group, optionItem)}
                        className="h-5 w-5 bg-slate-700 border-slate-600 text-sky-500 focus:ring-sky-600 mt-0.5 flex-shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-6 flex justify-between items-center bg-slate-900/50 rounded-b-lg">
            <span className="text-2xl font-bold text-white">${finalPrice.toFixed(2)}</span>
            <button
              onClick={handleAddToCartClick}
              className="px-6 py-3 rounded-lg bg-slate-200 text-slate-900 font-semibold hover:bg-white transition-colors active:scale-95"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
       <style jsx>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        @keyframes scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-up { animation: scale-up 0.3s ease-out forwards; }
      `}</style>
    </>
  );
};

export default ItemOptionsModal;
