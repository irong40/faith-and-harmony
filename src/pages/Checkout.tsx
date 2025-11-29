import { Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';

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
    setSubmitted(true);
    toast({
      title: "Order Submitted!",
      description: "We'll contact you shortly to complete your order.",
    });
  };

  if (items.length === 0 && !submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-4">Your cart is empty</h1>
          <Link to="/shop" className="text-accent hover:underline">Return to Shop</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground">
        <div className="max-w-2xl mx-auto px-8 py-20 text-center">
          <div className="bg-card rounded-3xl p-10 shadow-xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <DollarSign className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-primary font-display mb-4">Order Submitted!</h1>
            <p className="text-lg text-card-foreground mb-6">
              Thank you for your order! We've received your request and will contact you shortly at <strong>{formData.email}</strong> with payment instructions.
            </p>
            <div className="bg-secondary rounded-xl p-6 mb-6 text-left">
              <h3 className="font-bold text-primary mb-3">Payment Options:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-accent" />
                  <span><strong>PayPal:</strong> faithandharmonyllc@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span><strong>Cash App:</strong> $FaithandHarmony</span>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mb-8">Order total: <strong className="text-accent">${totalPrice.toFixed(2)}</strong> (+ shipping)</p>
            <Link 
              to="/shop"
              onClick={() => clearCart()}
              className="inline-block px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Back Link */}
        <Link to="/cart" className="inline-flex items-center gap-2 text-accent hover:text-primary-foreground mt-8 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </Link>

        <h1 className="text-4xl font-bold text-primary font-display mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-8 pb-20">
          {/* Order Form */}
          <div className="bg-card rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-primary mb-6">Shipping Information</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Full Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Email *</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Phone *</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Street Address *</label>
                <input 
                  type="text" 
                  name="address" 
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">City *</label>
                  <input 
                    type="text" 
                    name="city" 
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">State *</label>
                  <input 
                    type="text" 
                    name="state" 
                    value={formData.state}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">ZIP *</label>
                  <input 
                    type="text" 
                    name="zip" 
                    value={formData.zip}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Order Notes (optional)</label>
                <textarea 
                  name="notes" 
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                  placeholder="Special instructions for your order..."
                />
              </div>

              {/* Payment Options */}
              <div className="bg-secondary rounded-xl p-6 mt-6">
                <h3 className="font-bold text-primary mb-3">Payment Options:</h3>
                <p className="text-card-foreground mb-4">After submitting your order, you can pay via:</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-card p-3 rounded-lg">
                    <CreditCard className="w-6 h-6 text-accent" />
                    <div>
                      <p className="font-semibold">PayPal</p>
                      <p className="text-sm text-muted-foreground">faithandharmonyllc@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-card p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold">Cash App</p>
                      <p className="text-sm text-muted-foreground">$FaithandHarmony</p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-full hover:opacity-90 transition-all shadow-lg mt-6"
              >
                Submit Order
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="bg-card rounded-xl p-6 shadow-lg h-fit">
            <h2 className="text-xl font-bold text-primary mb-4">Order Summary</h2>
            <div className="space-y-4 border-b border-border pb-4 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1">
                    <p className="font-semibold text-primary">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.color} × {item.quantity}</p>
                  </div>
                  <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold">Calculated after order</span>
              </div>
            </div>
            <div className="flex justify-between text-xl font-bold text-primary pt-4 border-t border-border">
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-border">
          <p className="text-muted-foreground text-lg">&copy; 2025 Faith & Harmony LLC. All rights reserved.</p>
          <p className="text-accent text-sm mt-2 font-semibold">Dr. Adam Pierce - Rooted in Purpose, Driven by Service</p>
        </footer>
      </div>
    </div>
  );
};

export default Checkout;