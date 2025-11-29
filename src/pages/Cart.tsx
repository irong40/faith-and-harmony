import { Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import logoIcon from '@/assets/logo-icon.png';

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalItems, totalPrice } = useCart();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="max-w-6xl mx-auto px-8">
        {/* Header */}
        <header className="py-6 flex justify-between items-center border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoIcon} alt="Faith & Harmony" className="w-10 h-10" />
            <span className="text-2xl font-bold text-primary font-display">Faith & Harmony</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-accent transition-colors">Home</Link>
            <Link to="/services" className="text-foreground hover:text-accent transition-colors">Services</Link>
            <Link to="/shop" className="text-foreground hover:text-accent transition-colors">Shop</Link>
            <Link to="/cart" className="relative p-2 bg-secondary rounded-full">
              <ShoppingCart className="w-6 h-6 text-primary" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-primary text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </Link>
          </nav>
        </header>

        {/* Back Link */}
        <Link to="/shop" className="inline-flex items-center gap-2 text-accent hover:text-primary-foreground mt-8 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </Link>

        <h1 className="text-4xl font-bold text-primary font-display mb-8">Your Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-xl text-muted-foreground mb-6">Your cart is empty</p>
            <Link 
              to="/shop" 
              className="inline-block px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-all"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 pb-20">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-card rounded-xl p-4 shadow-md flex gap-4">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-primary">{item.name}</h3>
                    <p className="text-muted-foreground text-sm">Color: {item.color}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-accent">${item.price.toFixed(2)}</span>
                      {item.originalPrice && (
                        <span className="text-muted line-through text-sm">${item.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-muted hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="flex items-center border border-border rounded-lg overflow-hidden">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-secondary transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 font-semibold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-secondary transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-card rounded-xl p-6 shadow-lg h-fit">
              <h2 className="text-xl font-bold text-primary mb-4">Order Summary</h2>
              <div className="space-y-3 border-b border-border pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                  <span className="font-semibold">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-semibold">Calculated at checkout</span>
                </div>
              </div>
              <div className="flex justify-between text-xl font-bold text-primary mb-6">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <Link 
                to="/checkout"
                className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-full hover:opacity-90 transition-all shadow-lg flex items-center justify-center"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 border-t border-border">
          <p className="text-muted-foreground text-lg">&copy; 2025 Faith & Harmony LLC. All rights reserved.</p>
          <p className="text-accent text-sm mt-2 font-semibold">Dr. Adam Pierce - Rooted in Purpose, Driven by Service</p>
        </footer>
      </div>
    </div>
  );
};

export default Cart;