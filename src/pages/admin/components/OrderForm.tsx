import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useProducts, type Product } from "@/hooks/useProducts";

interface Customer {
  id: string;
  name: string;
  email: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  product_color: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const orderSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  shipping_address: z.string().max(255).optional(),
  shipping_city: z.string().max(100).optional(),
  shipping_state: z.string().max(50).optional(),
  shipping_zip: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  admin_notes: z.string().max(1000).optional(),
});

export type OrderFormData = z.infer<typeof orderSchema> & {
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
};

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OrderFormData) => Promise<void>;
  customers: Customer[];
}

export default function OrderForm({
  open,
  onOpenChange,
  onSubmit,
  customers,
}: OrderFormProps) {
  const { data: products = [] } = useProducts();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [shipping, setShipping] = useState<number>(0);

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_id: "",
      shipping_address: "",
      shipping_city: "",
      shipping_state: "",
      shipping_zip: "",
      notes: "",
      admin_notes: "",
    },
  });

  const selectedCustomer = customers.find(c => c.id === form.watch("customer_id"));

  useEffect(() => {
    if (selectedCustomer) {
      form.setValue("shipping_address", selectedCustomer.address || "");
      form.setValue("shipping_city", selectedCustomer.city || "");
      form.setValue("shipping_state", selectedCustomer.state || "");
      form.setValue("shipping_zip", selectedCustomer.zip || "");
    }
  }, [selectedCustomer, form]);

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const total = subtotal + shipping;

  const addItem = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const existingIndex = items.findIndex(item => item.product_id === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += quantity;
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          product_id: product.id,
          product_name: product.name,
          product_color: product.color,
          quantity,
          unit_price: product.price,
          total_price: product.price * quantity,
        },
      ]);
    }
    setSelectedProduct("");
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (data: z.infer<typeof orderSchema>) => {
    if (items.length === 0) {
      return;
    }
    await onSubmit({
      ...data,
      items,
      subtotal,
      shipping,
      total,
    });
    form.reset();
    setItems([]);
    setShipping(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Customer Selection */}
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} ({customer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Add Products */}
            <div className="space-y-3">
              <FormLabel>Order Items *</FormLabel>
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.color} (${product.price.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <Button type="button" onClick={addItem} disabled={!selectedProduct}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {items.length > 0 && (
                <div className="rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="px-3 py-2">
                            {item.product_name}
                            <span className="text-muted-foreground"> - {item.product_color}</span>
                          </td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">${item.unit_price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">${item.total_price.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">No items added yet</p>
              )}
            </div>

            {/* Shipping Address */}
            <div className="space-y-3">
              <FormLabel>Shipping Address</FormLabel>
              <FormField
                control={form.control}
                name="shipping_address"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="shipping_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipping_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipping_zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="ZIP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Shipping Cost */}
            <div>
              <FormLabel>Shipping Cost</FormLabel>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={shipping}
                onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                className="mt-1 w-32"
              />
            </div>

            {/* Notes */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes visible to customer..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="admin_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Internal notes..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Totals */}
            <div className="rounded-md bg-muted p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || items.length === 0}>
                {form.formState.isSubmitting ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
