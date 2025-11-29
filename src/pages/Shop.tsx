import { Link } from 'react-router-dom';
import { products } from '@/data/products';
import Navbar from '@/components/Navbar';

const Shop = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <h1 className="text-5xl font-bold mb-4 text-primary font-display">Faith & Harmony Store</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-accent to-amber-400 mx-auto mb-6 rounded-full"></div>
          <p className="text-xl text-accent font-semibold italic mb-4">
            "Unique apparel and gifts inspired by sisterhood, unity, and the brilliance of every Eastern Star"
          </p>
          <p className="text-lg text-foreground max-w-3xl mx-auto">
            Our products celebrate service, sisterhood, and movement. Each item is thoughtfully designed to honor 
            the traditions and values of the Order of the Eastern Star while bringing energy and joy to every gathering.
          </p>
        </section>

        {/* Product Grid */}
        <section className="pb-20">
          <h2 className="text-3xl font-bold mb-8 text-primary font-display text-center">Featured Products</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <Link 
                key={product.id} 
                to={`/shop/product/${product.id}`}
                className="group bg-card rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="aspect-square overflow-hidden bg-secondary">
                  <img 
                    src={product.image} 
                    alt={`${product.name} - ${product.color}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-primary mb-1">{product.name}</h3>
                  <p className="text-muted-foreground mb-3">Color: {product.color}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-accent">${product.price.toFixed(2)}</span>
                    {product.originalPrice && (
                      <span className="text-muted line-through">${product.originalPrice.toFixed(2)}</span>
                    )}
                    {product.originalPrice && (
                      <span className="bg-accent text-primary text-xs px-2 py-1 rounded-full font-semibold">SALE</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="pb-20">
          <div className="bg-primary rounded-3xl p-10 text-center">
            <h2 className="text-3xl font-bold mb-4 font-display text-primary-foreground">Stay Connected</h2>
            <p className="text-lg mb-6 text-secondary opacity-90">Follow our shop for new products and exclusive offers!</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email"
                className="px-6 py-3 rounded-full text-foreground bg-card flex-1 focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button className="px-8 py-3 bg-gradient-to-r from-accent to-amber-400 text-primary font-semibold rounded-full hover:opacity-90 transition-all">
                Subscribe
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-border">
          <p className="text-muted-foreground text-lg">&copy; 2025 Faith & Harmony LLC. All rights reserved.</p>
          <p className="text-accent text-sm mt-2 font-semibold">Dr. Adam Pierce - Rooted in Purpose, Driven by Service</p>
        </footer>
      </div>
    </div>
  );
};

export default Shop;