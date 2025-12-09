import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

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
  original_price: number | null;
  image: string;
  description: string;
  features: string[];
  category: string;
  coming_soon: boolean;
  sizes: ProductSize[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const transformProduct = (data: {
  id: string;
  name: string;
  color: string;
  price: number;
  original_price: number | null;
  image: string;
  description: string;
  features: string[];
  category: string;
  coming_soon: boolean;
  sizes: Json | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}): Product => ({
  ...data,
  sizes: data.sizes as unknown as ProductSize[] | null,
});

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data.map(transformProduct);
    },
  });
};

export const useProduct = (id: string | undefined) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .single();
      
      if (error) throw error;
      return transformProduct(data);
    },
    enabled: !!id,
  });
};
