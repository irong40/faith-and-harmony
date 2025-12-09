import fanWhite from '@/assets/products/fan-white.jpg';
import fanBlue from '@/assets/products/fan-blue.png';
import fanGreen from '@/assets/products/fan-green.jpg';
import dockArt from '@/assets/aerial/dock-after.png';
import treesArt from '@/assets/aerial/trees-after.png';
import creekArt from '@/assets/aerial/creek-after.png';

export interface ProductSize {
  label: string;
  dimensions: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  color: string;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  features: string[];
  category?: 'merchandise' | 'aerial-art';
  comingSoon?: boolean;
  sizes?: ProductSize[];
}

export const products: Product[] = [
  {
    id: 'fan-white',
    name: 'Order of the Eastern Star Line Dancing Fan',
    color: 'White',
    price: 25.00,
    image: fanWhite,
    description: 'Designed for sisters who bring energy and unity to every step. This fan is more than just an accessory—it\'s a symbol of service and sisterhood that celebrates the brilliance of every Eastern Star.',
    features: [
      'Vibrant Eastern Star colours',
      'Folding black plastic frame for portability',
      'Matte finish for a comfortable grip',
      'Perfect for line dancing and events',
      'Celebrates service and sisterhood'
    ],
    category: 'merchandise'
  },
  {
    id: 'fan-blue',
    name: 'Order of the Eastern Star Line Dancing Fan',
    color: 'Blue',
    price: 25.00,
    originalPrice: 35.00,
    image: fanBlue,
    description: 'Designed for sisters who bring energy and unity to every step. This fan is more than just an accessory—it\'s a symbol of service and sisterhood that celebrates the brilliance of every Eastern Star.',
    features: [
      'Vibrant Eastern Star colours in blue',
      'Folding black plastic frame for portability',
      'Matte finish for a comfortable grip',
      'Perfect for line dancing and events',
      'Celebrates service and sisterhood'
    ],
    category: 'merchandise'
  },
  {
    id: 'fan-green',
    name: 'Order of the Eastern Star Line Dancing Fan',
    color: 'Green',
    price: 15.00,
    originalPrice: 25.00,
    image: fanGreen,
    description: 'Designed for sisters who bring energy and unity to every step. This fan is more than just an accessory—it\'s a symbol of service and sisterhood that celebrates the brilliance of every Eastern Star.',
    features: [
      'Vibrant Eastern Star colours in green',
      'Folding black plastic frame for portability',
      'Matte finish for a comfortable grip',
      'Perfect for line dancing and events',
      'Celebrates service and sisterhood'
    ],
    category: 'merchandise'
  },
  // Aerial Art Prints - Coming Soon
  {
    id: 'aerial-dock-sunset',
    name: 'Lakeside Dock at Sunset',
    color: 'Oil Painting',
    price: 149.00,
    image: dockArt,
    description: 'A stunning aerial view of a peaceful lakeside dock transformed into a vibrant oil painting. This timeless piece captures the serenity of nature and the warmth of a golden sunset.',
    features: [
      'Museum-quality giclée print',
      'Archival-grade canvas or premium paper',
      'Vivid, fade-resistant inks',
      'Ready to frame or display',
      'Certificate of authenticity included'
    ],
    category: 'aerial-art',
    comingSoon: true,
    sizes: [
      { label: 'Small', dimensions: '12" x 8"', price: 79.00 },
      { label: 'Medium', dimensions: '24" x 16"', price: 149.00 },
      { label: 'Large', dimensions: '36" x 24"', price: 249.00 },
      { label: 'XL Canvas', dimensions: '48" x 32"', price: 399.00 }
    ]
  },
  {
    id: 'aerial-forest-canopy',
    name: 'Autumn Forest Canopy',
    color: 'Oil Painting',
    price: 149.00,
    image: treesArt,
    description: 'An aerial masterpiece showcasing the breathtaking colors of an autumn forest. The rich oranges, reds, and golds are transformed into an impressionist oil painting style.',
    features: [
      'Museum-quality giclée print',
      'Archival-grade canvas or premium paper',
      'Vivid, fade-resistant inks',
      'Ready to frame or display',
      'Certificate of authenticity included'
    ],
    category: 'aerial-art',
    comingSoon: true,
    sizes: [
      { label: 'Small', dimensions: '12" x 8"', price: 79.00 },
      { label: 'Medium', dimensions: '24" x 16"', price: 149.00 },
      { label: 'Large', dimensions: '36" x 24"', price: 249.00 },
      { label: 'XL Canvas', dimensions: '48" x 32"', price: 399.00 }
    ]
  },
  {
    id: 'aerial-autumn-creek',
    name: 'Carrollon Creek',
    color: 'Oil Painting',
    price: 149.00,
    image: creekArt,
    description: 'A serene aerial view of Carrollon Creek winding through autumn foliage, transformed into a stunning impressionist oil painting that brings warmth and tranquility to any space.',
    features: [
      'Museum-quality giclée print',
      'Archival-grade canvas or premium paper',
      'Vivid, fade-resistant inks',
      'Ready to frame or display',
      'Certificate of authenticity included'
    ],
    category: 'aerial-art',
    comingSoon: true,
    sizes: [
      { label: 'Small', dimensions: '12" x 8"', price: 79.00 },
      { label: 'Medium', dimensions: '24" x 16"', price: 149.00 },
      { label: 'Large', dimensions: '36" x 24"', price: 249.00 },
      { label: 'XL Canvas', dimensions: '48" x 32"', price: 399.00 }
    ]
  }
];
