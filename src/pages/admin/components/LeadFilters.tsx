import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeadFiltersProps {
  onSearchChange: (query: string) => void;
}

export default function LeadFilters({ onSearchChange }: LeadFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, onSearchChange]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company, email, city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
