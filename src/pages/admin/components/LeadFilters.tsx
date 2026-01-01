import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface LeadFiltersProps {
  onSearchChange: (query: string) => void;
  onFiltersChange: (filters: FilterValues) => void;
  portfolioTypes: string[];
}

export interface FilterValues {
  priority: string;
  portfolioType: string;
  hasEmail: string;
}

const priorityOptions = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const emailOptions = [
  { value: "all", label: "All" },
  { value: "yes", label: "Has Email" },
  { value: "no", label: "No Email" },
];

export default function LeadFilters({ onSearchChange, onFiltersChange, portfolioTypes }: LeadFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    priority: "all",
    portfolioType: "all",
    hasEmail: "all",
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, onSearchChange]);

  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const clearFilters = () => {
    const defaultFilters: FilterValues = {
      priority: "all",
      portfolioType: "all",
      hasEmail: "all",
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== "all").length;

  return (
    <div className="space-y-3">
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
        
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Select
              value={filters.priority}
              onValueChange={(value) => handleFilterChange("priority", value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.portfolioType}
              onValueChange={(value) => handleFilterChange("portfolioType", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Portfolio Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {portfolioTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.hasEmail}
              onValueChange={(value) => handleFilterChange("hasEmail", value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Email Status" />
              </SelectTrigger>
              <SelectContent>
                {emailOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
