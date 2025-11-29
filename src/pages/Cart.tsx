import { Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalItems, totalPrice } = useCart();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto px-8">
        {/* Header */}
        <header className="py-6 flex justify-between items-center border-b border-indigo-200">
          <Link to="/" className="text-2xl font-bold text-indigo-900 font-serif">Faith & Harmony</Link>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-gray-700 hover:text-indigo-700 transition-colors">Home</Link>
            <Link to="/services" className="text-gray-700 hover:text-indigo-700 transition-colors">Services</Link>
            <Link to="/shop" className="text-gray-700 hover:text-indigo-700 transition-colors">Shop</Link>
            <Link to="/cart" className="relative p-2 bg-indigo-100 rounded-full">
              <ShoppingCart className="w-6 h-6 text-indigo-700" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </Link>
          </nav>
        </header>

        {/* Back Link */}
        <Link to="/shop" className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mt-8 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </Link>

        <h1 className="text-4xl font-bold text-indigo-900 font-serif mb-8">Your Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-6">Your cart is empty</p>
            <Link 
              to="/shop" 
              className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-full hover:from-indigo-700 hover:to-indigo-800 transition-all"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 pb-20">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-4 shadow-md flex gap-4">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-indigo-900">{item.name}</h3>
                    <p className="text-gray-600 text-sm">Color: {item.color}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-indigo-700">${item.price.toFixed(2)}</span>
                      {item.originalPrice && (
                        <span className="text-gray-400 line-through text-sm">${item.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="flex items-center border border-indigo-200 rounded-lg overflow-hidden">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-indigo-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 font-semibold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-indigo-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl p-6 shadow-lg h-fit">
              <h2 className="text-xl font-bold text-indigo-900 mb-4">Order Summary</h2>
              <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({totalItems} items)</span>
                  <span className="font-semibold">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold">Calculated at checkout</span>
                </div>
              </div>
              <div className="flex justify-between text-xl font-bold text-indigo-900 mb-6">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <Link 
                to="/checkout"
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-lg rounded-full hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg flex items-center justify-center"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 border-t border-indigo-200">
          <p className="text-gray-600 text-lg">&copy; 2025 Faith & Harmony LLC. All rights reserved.</p>
          <p className="text-indigo-700 text-sm mt-2 font-semibold">Dr. Adam Pierce - Rooted in Purpose, Driven by Service</p>
        </footer>
      </div>
    </div>
  );
};

export default Cart;
