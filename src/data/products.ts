import fanWhite from '@/assets/products/fan-white.jpg';
import fanBlue from '@/assets/products/fan-blue.png';
import fanGreen from '@/assets/products/fan-green.jpg';

export interface Product {
  id: string;
  name: string;
  color: string;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  features: string[];
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
    ]
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
    ]
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
    ]
  }
];
