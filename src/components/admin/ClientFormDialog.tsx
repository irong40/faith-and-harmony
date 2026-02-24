import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { clientSchema, type ClientFormValues } from "@/lib/schemas";

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSuccess: (client?: Client) => void;
  minimal?: boolean;
}

export default function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
  minimal = false,
}: ClientFormDialogProps) {
  const { toast } = useToast();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "VA",
      zip: "",
      notes: "",
    },
  });

  // Pre-fill when editing
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name || "",
        company: client.company || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "VA",
        zip: client.zip || "",
        notes: client.notes || "",
      });
    } else {
      form.reset({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "VA",
        zip: "",
        notes: "",
      });
    }
  }, [client, open, form]);

  const onSubmit = async (values: ClientFormValues) => {
    const payload = {
      name: values.name,
      company: values.company || null,
      email: values.email || null,
      phone: values.phone || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || "VA",
      zip: values.zip || null,
      notes: values.notes || null,
    };

    let error;
    let savedClient: Client | undefined;

    if (client?.id) {
      const { error: updateError } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", client.id);
      error = updateError;
    } else {
      const { data, error: insertError } = await supabase
        .from("clients")
        .insert(payload)
        .select("id, name, company, email, phone, address, city, state, zip, notes")
        .single();
      error = insertError;
      if (data) savedClient = data as Client;
    }

    if (error) {
      toast({
        title: "Error saving client",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: client?.id ? "Client updated" : "Client created" });
      onOpenChange(false);
      onSuccess(savedClient);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client?.id ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!minimal && (
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className={`grid gap-4 ${minimal ? "grid-cols-1" : "sm:grid-cols-2"}`}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(757) 555-0100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!minimal && (
              <>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Norfolk" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="VA" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP</FormLabel>
                        <FormControl>
                          <Input placeholder="23510" maxLength={10} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Internal notes about this client..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : client?.id
                  ? "Update Client"
                  : "Add Client"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
