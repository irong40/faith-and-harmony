import { Link } from 'react-router-dom';
import { useProducts, ProductSize } from '@/hooks/useProducts';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WaitlistForm from '@/components/WaitlistForm';
import { ProductImage } from '@/components/ProductImage';
import { Clock, Loader2 } from 'lucide-react';

const Shop = () => {
  const { data: products, isLoading, error } = useProducts();

  const merchandiseProducts = products?.filter(p => p.category !== 'aerial-art') || [];
  const aerialArtProducts = products?.filter(p => p.category === 'aerial-art') || [];

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

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20 text-destructive">
            <p>Failed to load products. Please try again later.</p>
          </div>
        )}

        {/* Merchandise Products */}
        {!isLoading && merchandiseProducts.length > 0 && (
          <section className="pb-16">
            <h2 className="text-3xl font-bold mb-8 text-primary font-display text-center">Featured Products</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {merchandiseProducts.map((product) => (
                <Link 
                  key={product.id} 
                  to={`/shop/product/${product.id}`}
                  className="group bg-card rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <ProductImage 
                    src={product.image}
                    alt={`${product.name} - ${product.color}`}
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-primary mb-1">{product.name}</h3>
                    <p className="text-muted-foreground mb-3">Color: {product.color}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-accent">${product.price.toFixed(2)}</span>
                      {product.original_price && (
                        <span className="text-muted line-through">${product.original_price.toFixed(2)}</span>
                      )}
                      {product.original_price && (
                        <span className="bg-accent text-primary text-xs px-2 py-1 rounded-full font-semibold">SALE</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Aerial Art Prints - Coming Soon */}
        {!isLoading && aerialArtProducts.length > 0 && (
          <section className="pb-16">
            <div className="flex items-center justify-center gap-3 mb-8">
              <h2 className="text-3xl font-bold text-primary font-display text-center">Aerial Art Prints</h2>
              <span className="flex items-center gap-1.5 bg-accent/20 text-accent px-3 py-1.5 rounded-full text-sm font-semibold">
                <Clock className="w-4 h-4" />
                Coming Soon
              </span>
            </div>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transform your space with stunning aerial photography turned into timeless art. 
              Available soon in multiple sizes and finishes.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {aerialArtProducts.map((product) => {
                const sizes = product.sizes as ProductSize[] | null;
                return (
                  <div 
                    key={product.id}
                    className="group bg-card rounded-2xl overflow-hidden shadow-lg"
                  >
                    <div className="relative">
                      <ProductImage 
                        src={product.image}
                        alt={product.name}
                      />
                      <div className="absolute top-3 right-3 bg-accent text-primary px-3 py-1.5 rounded-full font-bold text-sm shadow-lg">
                        Coming Soon
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-primary mb-1">{product.name}</h3>
                      <p className="text-muted-foreground mb-3">{product.color}</p>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl font-bold text-accent">From ${sizes?.[0]?.price.toFixed(2) || product.price.toFixed(2)}</span>
                      </div>
                      {sizes && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {sizes.map((size) => (
                            <span key={size.label} className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">
                              {size.label}
                            </span>
                          ))}
                        </div>
                      )}
                      <WaitlistForm productId={product.id} productName={product.name} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
      </div>
      <Footer />
    </div>
  );
};

export default Shop;
