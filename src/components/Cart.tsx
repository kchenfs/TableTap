import React from 'react';
import { X, Minus, Plus, ShoppingCart } from 'lucide-react';
import { CartItem } from '../types';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (cartId: string, quantity: number) => void;
  onRemoveItem: (cartId: string) => void;
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
  const TAX_RATE = 0.13;
  const subtotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
  const tax = subtotal * TAX_RATE;
  const totalWithTax = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 shadow-xl z-50">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-slate-50">Your Cart</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="text-center text-slate-400 mt-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.cartId} className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pr-2">
                        <h3 className="font-medium text-slate-200">{item.menuItem.name}</h3>
                        <div className="text-sm text-slate-400 mt-1 space-y-1">
                          {Object.entries(item.selectedOptions).map(([groupName, option]) => (
                            <p key={groupName}>
                              <span className="font-semibold">{groupName}:</span> {option.name}
                            </p>
                          ))}
                        </div>
                         <p className="text-sm text-slate-400 mt-2">${Number(item.finalPrice).toFixed(2)} each</p>
                      </div>
                      <button 
                        onClick={() => onRemoveItem(item.cartId)}
                        className="text-slate-400 hover:text-red-400 flex-shrink-0"
                        disabled={isCheckingOut}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onUpdateQuantity(item.cartId, item.quantity - 1)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700 disabled:opacity-50"
                          disabled={item.quantity <= 1 || isCheckingOut}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-slate-200 font-medium w-8 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.cartId, item.quantity + 1)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700 disabled:opacity-50"
                          disabled={isCheckingOut}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-slate-50 font-semibold">
                        ${(item.finalPrice * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-slate-800 p-6">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Tax (13%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between font-semibold text-lg text-slate-50 border-t border-slate-700 pt-4 mb-4">
                <span>Total</span>
                <span>${totalWithTax.toFixed(2)}</span>
              </div>
              <textarea
                className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-200 mb-4"
                rows={2}
                placeholder="Add special instructions..."
                value={orderNote}
                onChange={(e) => onNoteChange(e.target.value)}
                disabled={isCheckingOut}
              />
              <button
                onClick={() => onCheckout(cart, totalWithTax)}
                disabled={isCheckingOut}
                className="w-full rounded-lg bg-slate-200 py-3 font-semibold text-slate-900 disabled:opacity-50"
              >
                {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

