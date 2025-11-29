import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, ArrowLeft, Check } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { products } from '@/data/products';
import { useToast } from '@/hooks/use-toast';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart, totalItems } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  const product = products.find(p => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-900 mb-4">Product Not Found</h1>
          <Link to="/shop" className="text-indigo-700 hover:underline">Return to Shop</Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        color: product.color
      });
    }
    toast({
      title: "Added to Cart!",
      description: `${quantity} × ${product.name} (${product.color})`,
    });
    setQuantity(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto px-8">
        {/* Header */}
        <header className="py-6 flex justify-between items-center border-b border-indigo-200">
          <Link to="/" className="text-2xl font-bold text-indigo-900 font-serif">Faith & Harmony</Link>
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

        {/* Back Link */}
        <Link to="/shop" className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mt-8 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>

        {/* Product Detail */}
        <div className="grid md:grid-cols-2 gap-12 pb-20">
          {/* Image */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
            <img 
              src={product.image} 
              alt={`${product.name} - ${product.color}`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-indigo-900 font-serif mb-2">{product.name}</h1>
              <p className="text-lg text-gray-600">Color: {product.color}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-indigo-700">${product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <>
                  <span className="text-xl text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                  <span className="bg-amber-500 text-white px-3 py-1 rounded-full font-semibold">SALE</span>
                </>
              )}
            </div>

            <p className="text-lg text-gray-700 leading-relaxed">{product.description}</p>

            <div className="bg-indigo-50 rounded-xl p-6">
              <h3 className="font-bold text-indigo-900 mb-3">Features:</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-700">Quantity:</span>
              <div className="flex items-center border border-indigo-200 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-indigo-100 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-6 py-3 font-semibold text-lg">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button 
              onClick={handleAddToCart}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-lg rounded-full hover:from-indigo-700 hover:to-indigo-800 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Add to Cart
            </button>
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

export default ProductDetail;
