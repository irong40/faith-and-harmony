import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, DollarSign, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

const Checkout = () => {
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send an email or save to database
    setSubmitted(true);
    toast({
      title: "Order Submitted!",
      description: "We'll contact you shortly to complete your order.",
    });
  };

  const orderSummary = items.map(item => 
    `${item.quantity}x ${item.name} (${item.color}) - $${(item.price * item.quantity).toFixed(2)}`
  ).join('\n');

  if (items.length === 0 && !submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-900 mb-4">Your cart is empty</h1>
          <Link to="/shop" className="text-indigo-700 hover:underline">Return to Shop</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 font-sans text-gray-800">
        <div className="max-w-2xl mx-auto px-8 py-20 text-center">
          <div className="bg-white rounded-3xl p-10 shadow-xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <DollarSign className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-indigo-900 font-serif mb-4">Order Submitted!</h1>
            <p className="text-lg text-gray-700 mb-6">
              Thank you for your order! We've received your request and will contact you shortly at <strong>{formData.email}</strong> with payment instructions.
            </p>
            <div className="bg-indigo-50 rounded-xl p-6 mb-6 text-left">
              <h3 className="font-bold text-indigo-900 mb-3">Payment Options:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span><strong>PayPal:</strong> faithandharmonyllc@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span><strong>Cash App:</strong> $FaithandHarmony</span>
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-8">Order total: <strong className="text-indigo-700">${totalPrice.toFixed(2)}</strong> (+ shipping)</p>
            <Link 
              to="/shop"
              onClick={() => clearCart()}
              className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-full hover:from-indigo-700 hover:to-indigo-800 transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <Link to="/cart" className="relative p-2 hover:bg-indigo-100 rounded-full transition-colors">
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
        <Link to="/cart" className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mt-8 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </Link>

        <h1 className="text-4xl font-bold text-indigo-900 font-serif mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-8 pb-20">
          {/* Order Form */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-indigo-900 mb-6">Shipping Information</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Street Address *</label>
                <input 
                  type="text" 
                  name="address" 
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                  <input 
                    type="text" 
                    name="city" 
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">State *</label>
                  <input 
                    type="text" 
                    name="state" 
                    value={formData.state}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ZIP *</label>
                  <input 
                    type="text" 
                    name="zip" 
                    value={formData.zip}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Order Notes (optional)</label>
                <textarea 
                  name="notes" 
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Special instructions for your order..."
                />
              </div>

              {/* Payment Options */}
              <div className="bg-amber-50 rounded-xl p-6 mt-6">
                <h3 className="font-bold text-indigo-900 mb-3">Payment Options:</h3>
                <p className="text-gray-700 mb-4">After submitting your order, you can pay via:</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg">
                    <CreditCard className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="font-semibold">PayPal</p>
                      <p className="text-sm text-gray-600">faithandharmonyllc@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold">Cash App</p>
                      <p className="text-sm text-gray-600">$FaithandHarmony</p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-lg rounded-full hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg mt-6"
              >
                Submit Order
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl p-6 shadow-lg h-fit">
            <h2 className="text-xl font-bold text-indigo-900 mb-4">Order Summary</h2>
            <div className="space-y-4 border-b border-gray-200 pb-4 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1">
                    <p className="font-semibold text-indigo-900">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.color} × {item.quantity}</p>
                  </div>
                  <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">Calculated after order</span>
              </div>
            </div>
            <div className="flex justify-between text-xl font-bold text-indigo-900 pt-4 border-t border-gray-200">
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-indigo-200">
          <p className="text-gray-600 text-lg">&copy; 2025 Faith & Harmony LLC. All rights reserved.</p>
          <p className="text-indigo-700 text-sm mt-2 font-semibold">Dr. Adam Pierce - Rooted in Purpose, Driven by Service</p>
        </footer>
      </div>
    </div>
  );
};

export default Checkout;
