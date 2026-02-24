import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
}

interface ClientAutocompleteProps {
  value: string;
  onChange: (clientId: string) => void;
  onAddNew?: () => void;
  disabled?: boolean;
}

export default function ClientAutocomplete({
  value,
  onChange,
  onAddNew,
  disabled,
}: ClientAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedClient = clients.find((c) => c.id === value);

  const fetchClients = useCallback(async (query: string) => {
    setLoading(true);
    let req = supabase
      .from("clients")
      .select("id, name, company, email, phone")
      .eq("is_active", true)
      .order("name")
      .limit(20);

    if (query.trim()) {
      req = req.or(
        `name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%`
      );
    }

    const { data } = await req;
    setClients(data || []);
    setLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (open) fetchClients(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, fetchClients]);

  // Load initial list when opened
  useEffect(() => {
    if (open) fetchClients("");
  }, [open, fetchClients]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-[44px]"
          disabled={disabled}
        >
          {selectedClient ? (
            <span className="truncate text-left">
              {selectedClient.name}
              {selectedClient.company && (
                <span className="text-muted-foreground ml-1">
                  ({selectedClient.company})
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Search clients...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, company, or email..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading...</CommandEmpty>
            ) : clients.length === 0 ? (
              <CommandEmpty>No clients found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                    className="min-h-[44px]"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{client.name}</span>
                      {(client.company || client.email) && (
                        <span className="text-xs text-muted-foreground">
                          {[client.company, client.email]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {onAddNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    onAddNew();
                  }}
                  className="text-primary min-h-[44px]"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add new client...
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
