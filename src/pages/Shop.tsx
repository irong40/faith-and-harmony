import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { products } from '@/data/products';

const Shop = () => {
  const { totalItems } = useCart();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto px-8">
        {/* Header */}
        <header className="py-6 flex justify-between items-center border-b border-indigo-200">
          <Link to="/" className="text-2xl font-bold text-indigo-900 font-serif">
            Faith & Harmony
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-gray-700 hover:text-indigo-700 transition-colors">Home</Link>
            <Link to="/services" className="text-gray-700 hover:text-indigo-700 transition-colors">Services</Link>
            <Link to="/shop" className="text-indigo-700 font-semibold">Shop</Link>
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

        {/* Hero Section */}
        <section className="py-16 text-center">
          <h1 className="text-5xl font-bold mb-4 text-indigo-900 font-serif">Faith & Harmony Store</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 mx-auto mb-6 rounded-full"></div>
          <p className="text-xl text-indigo-700 font-semibold italic mb-4">
            "Unique apparel and gifts inspired by sisterhood, unity, and the brilliance of every Eastern Star"
          </p>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            Our products celebrate service, sisterhood, and movement. Each item is thoughtfully designed to honor 
            the traditions and values of the Order of the Eastern Star while bringing energy and joy to every gathering.
          </p>
        </section>

        {/* Product Grid */}
        <section className="pb-20">
          <h2 className="text-3xl font-bold mb-8 text-indigo-900 font-serif text-center">Featured Products</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <Link 
                key={product.id} 
                to={`/shop/product/${product.id}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img 
                    src={product.image} 
                    alt={`${product.name} - ${product.color}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-indigo-900 mb-1">{product.name}</h3>
                  <p className="text-gray-600 mb-3">Color: {product.color}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-indigo-700">${product.price.toFixed(2)}</span>
                    {product.originalPrice && (
                      <span className="text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                    )}
                    {product.originalPrice && (
                      <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">SALE</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="pb-20">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-10 text-center text-white">
            <h2 className="text-3xl font-bold mb-4 font-serif">Stay Connected</h2>
            <p className="text-lg mb-6 opacity-90">Follow our shop for new products and exclusive offers!</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email"
                className="px-6 py-3 rounded-full text-gray-800 flex-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button className="px-8 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-semibold rounded-full hover:from-amber-600 hover:to-yellow-500 transition-all">
                Subscribe
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-indigo-200">
          <p className="text-gray-600 text-lg">&copy; 2025 Faith & Harmony LLC. All rights reserved.</p>
          <p className="text-indigo-700 text-sm mt-2 font-semibold">Dr. Adam Pierce - Rooted in Purpose, Driven by Service</p>
        </footer>
      </div>
    </div>
  );
};

export default Shop;
