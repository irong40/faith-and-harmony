import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, RefreshCw, Plus, Eye, Edit } from "lucide-react";
import { format } from "date-fns";
import AdminNav from "./components/AdminNav";
import OrderForm, { type OrderFormData } from "./components/OrderForm";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_color: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  customer_id: string | null;
  status: OrderStatus | null;
  subtotal: number;
  shipping: number | null;
  total: number;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  customers?: { name: string; email: string } | null;
  order_items?: OrderItem[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "confirmed", label: "Confirmed", color: "bg-blue-500" },
  { value: "processing", label: "Processing", color: "bg-purple-500" },
  { value: "shipped", label: "Shipped", color: "bg-orange-500" },
  { value: "delivered", label: "Delivered", color: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500" },
];

export default function Orders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<OrderStatus>("pending");
  const [editNotes, setEditNotes] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, customers(name, email), order_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading orders",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from("customers").select("id, name, email, address, city, state, zip");
    setCustomers(data || []);
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      order.customers?.name.toLowerCase().includes(searchLower) ||
      order.customers?.email.toLowerCase().includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateOrder = async (data: OrderFormData) => {
    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: data.customer_id,
        subtotal: data.subtotal,
        shipping: data.shipping,
        total: data.total,
        shipping_address: data.shipping_address || null,
        shipping_city: data.shipping_city || null,
        shipping_state: data.shipping_state || null,
        shipping_zip: data.shipping_zip || null,
        notes: data.notes || null,
        admin_notes: data.admin_notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      toast({
        title: "Error creating order",
        description: orderError.message,
        variant: "destructive",
      });
      return;
    }

    // Create order items
    const { error: itemsError } = await supabase.from("order_items").insert(
      data.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_color: item.product_color,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))
    );

    if (itemsError) {
      toast({
        title: "Error creating order items",
        description: itemsError.message,
        variant: "destructive",
      });
      return;
    }

    // Get customer info for invoice email
    const customer = customers.find((c) => c.id === data.customer_id);
    
    if (customer?.email) {
      // Send invoice email with PDF
      try {
        const { error: invoiceError } = await supabase.functions.invoke(
          "send-order-invoice-email",
          {
            body: {
              type: "invoice",
              order_id: order.id,
              customer_name: customer.name,
              customer_email: customer.email,
              customer_address: data.shipping_address || customer.address,
              customer_city: data.shipping_city || customer.city,
              customer_state: data.shipping_state || customer.state,
              customer_zip: data.shipping_zip || customer.zip,
              items: data.items.map((item) => ({
                product_name: item.product_name,
                product_color: item.product_color,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
              })),
              subtotal: data.subtotal,
              shipping: data.shipping,
              total: data.total,
              created_at: new Date().toISOString(),
            },
          }
        );

        if (invoiceError) {
          console.error("Failed to send invoice:", invoiceError);
          toast({
            title: "Order created",
            description: "Order saved but invoice email failed to send.",
          });
        } else {
          toast({
            title: "Order created successfully",
            description: "Invoice email sent to customer.",
          });
        }
      } catch (err) {
        console.error("Error sending invoice:", err);
        toast({
          title: "Order created",
          description: "Order saved but invoice email failed to send.",
        });
      }
    } else {
      toast({ title: "Order created successfully" });
    }

    setIsFormOpen(false);
    fetchOrders();
  };

  const sendStatusNotification = async (order: Order, newStatus: OrderStatus) => {
    // Only send if status actually changed and customer has email
    if (!order.customers?.email || order.status === newStatus) return;
    
    // Skip notification for "pending" status as it's the default
    if (newStatus === "pending") return;

    try {
      const { error } = await supabase.functions.invoke("send-order-status-email", {
        body: {
          customer_email: order.customers.email,
          customer_name: order.customers.name,
          order_id: order.id,
          new_status: newStatus,
          order_total: order.total,
          order_items: order.order_items?.map((item) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            total_price: item.total_price,
          })) || [],
          shipping_address: order.shipping_address
            ? `${order.shipping_address}, ${order.shipping_city || ""}, ${order.shipping_state || ""} ${order.shipping_zip || ""}`
            : undefined,
        },
      });

      if (error) {
        console.error("Failed to send status notification:", error);
        toast({
          title: "Order updated",
          description: "Status updated but email notification failed to send.",
          variant: "default",
        });
      } else {
        toast({
          title: "Order updated",
          description: `Customer notified about "${newStatus}" status.`,
        });
      }
    } catch (err) {
      console.error("Error sending notification:", err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedOrder) return;

    const previousStatus = selectedOrder.status;
    const statusChanged = previousStatus !== editStatus;

    const { error } = await supabase
      .from("orders")
      .update({
        status: editStatus,
        admin_notes: editNotes,
      })
      .eq("id", selectedOrder.id);

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Send notification if status changed
      if (statusChanged) {
        await sendStatusNotification(selectedOrder, editStatus);
      } else {
        toast({ title: "Order updated successfully" });
      }
      setIsEditOpen(false);
      fetchOrders();
    }
  };

  const getStatusBadge = (status: string | null) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={`${statusOption?.color || "bg-muted"} text-white`}>
        {statusOption?.label || status || "Unknown"}
      </Badge>
    );
  };

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const openEdit = (order: Order) => {
    setSelectedOrder(order);
    setEditStatus(order.status || "pending");
    setEditNotes(order.admin_notes || "");
    setIsEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Orders</h1>
            <p className="text-sm text-muted-foreground">Manage customer orders</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchOrders} variant="outline" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by customer or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {STATUS_OPTIONS.map((status) => {
            const count = orders.filter((o) => o.status === status.value).length;
            return (
              <div
                key={status.value}
                className="rounded-lg border border-border bg-card p-4 text-center"
              >
                <div className="text-2xl font-bold text-foreground">{count}</div>
                <div className="text-sm text-muted-foreground">{status.label}</div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap">
                      {order.created_at
                        ? format(new Date(order.created_at), "MMM d, yyyy")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.customers?.name || "—"}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.customers?.email || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {order.order_items?.length || 0} items
                    </TableCell>
                    <TableCell className="font-medium">
                      ${Number(order.total).toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(order)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-mono text-sm">{selectedOrder.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedOrder.customers?.name || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.customers?.email}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Order Date</Label>
                  <p className="font-medium">
                    {selectedOrder.created_at
                      ? format(new Date(selectedOrder.created_at), "MMMM d, yyyy")
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address && (
                <div>
                  <Label className="text-muted-foreground">Shipping Address</Label>
                  <p className="font-medium">
                    {selectedOrder.shipping_address}
                    {selectedOrder.shipping_city && <>, {selectedOrder.shipping_city}</>}
                    {selectedOrder.shipping_state && <>, {selectedOrder.shipping_state}</>}
                    {selectedOrder.shipping_zip && <> {selectedOrder.shipping_zip}</>}
                  </p>
                </div>
              )}

              {/* Order Items */}
              <div>
                <Label className="text-muted-foreground">Order Items</Label>
                <div className="mt-2 rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.order_items?.map((item) => (
                        <tr key={item.id} className="border-t border-border">
                          <td className="px-3 py-2">
                            {item.product_name}
                            {item.product_color && (
                              <span className="text-muted-foreground">
                                {" "}
                                - {item.product_color}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">
                            ${Number(item.unit_price).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            ${Number(item.total_price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-md bg-muted p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>${Number(selectedOrder.shipping || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                  <span>Total:</span>
                  <span>${Number(selectedOrder.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <Label className="text-muted-foreground">Order Notes</Label>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {selectedOrder.admin_notes && (
                <div>
                  <Label className="text-muted-foreground">Admin Notes</Label>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                    {selectedOrder.admin_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as OrderStatus)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Admin Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add internal notes about this order..."
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Order Form */}
      <OrderForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateOrder}
        customers={customers}
      />
    </div>
  );
}
