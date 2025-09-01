import React from 'react';
import { X, Minus, Plus, ShoppingCart } from 'lucide-react';
import { CartItem } from '../types';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: (cart: CartItem[], total: number) => Promise<void>;
  isCheckingOut?: boolean;
  orderNote: string;
  onNoteChange: (note: string) => void;
}

export default function Cart({ 
  isOpen, 
  onClose, 
  cart, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  isCheckingOut = false,
  orderNote,
  onNoteChange
}: CartProps) {
  const TAX_RATE = 0.13; // 13%

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * TAX_RATE;
  const totalWithTax = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Cart Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 shadow-xl z-50 transform transition-transform">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-slate-300" />
              <h2 className="text-lg font-semibold text-slate-50">Your Cart</h2>
              {totalItems > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300">
                  {totalItems}
                </span>
              )}
            </div>
            <button 
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* --- Start of Restored Code --- */}
            {cart.length === 0 ? (
              <div className="text-center text-slate-400 mt-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-200">{item.name}</h3>
                        <p className="text-sm text-slate-400 mt-1">${Number(item.price).toFixed(2)} each</p>
                      </div>
                      <button 
                        onClick={() => onRemoveItem(item.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                        disabled={isCheckingOut}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={item.quantity <= 1 || isCheckingOut}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-slate-200 font-medium w-8 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isCheckingOut}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-slate-50 font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* --- End of Restored Code --- */}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="border-t border-slate-800 p-6">
              <div className="flex items-center justify-between mb-2 text-slate-300">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mb-4 text-slate-300">
                <span>Tax (HST):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mb-4 border-t border-slate-700 pt-4">
                <span className="text-lg font-semibold text-slate-50">Total:</span>
                <span className="text-lg font-semibold text-slate-50">${totalWithTax.toFixed(2)}</span>
              </div>
              <div className="mb-4">
                <label htmlFor="order-note" className="block text-sm font-medium text-slate-300 mb-2">
                  Special Instructions
                </label>
                <textarea
                  id="order-note"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-500 resize-none"
                  rows={3}
                  placeholder="Add any special requests, allergies, or notes here..."
                  value={orderNote}
                  onChange={(e) => onNoteChange(e.target.value)}
                  disabled={isCheckingOut}
                />
              </div>
              <button
                onClick={() => onCheckout(cart, totalWithTax)}
                disabled={isCheckingOut}
                className="w-full rounded-lg bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingOut ? 'Processing Order...' : 'Proceed to Checkout'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}