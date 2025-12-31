import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, CheckCircle, X } from "lucide-react";

interface LeadGenModalProps {
  open: boolean;
  onClose: () => void;
}

const defaultCities = [
  'Norfolk VA',
  'Virginia Beach VA',
  'Chesapeake VA',
  'Hampton VA',
  'Newport News VA',
  'Suffolk VA',
  'Portsmouth VA',
];

const defaultNiches = [
  'property management company',
  'real estate agency',
  'construction company',
  'roofing contractor',
  'home builder',
  'commercial real estate',
];

export default function LeadGenModal({ open, onClose }: LeadGenModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCities, setSelectedCities] = useState<string[]>(defaultCities.slice(0, 3));
  const [selectedNiches, setSelectedNiches] = useState<string[]>(defaultNiches.slice(0, 2));
  const [resultsPerSearch, setResultsPerSearch] = useState(10);
  const [result, setResult] = useState<{
    searchesPerformed: number;
    rawResultsFound: number;
    duplicatesFiltered: number;
    emailsFound: number;
    aiDraftsGenerated: number;
    leadsCreated: number;
    estimatedCost: number;
  } | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-leads', {
        body: {
          config: {
            cities: selectedCities,
            niches: selectedNiches,
            resultsPerSearch,
          },
          jobType: 'manual',
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setResult(data.stats);
      queryClient.invalidateQueries({ queryKey: ['drone-leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      toast({
        title: "Lead generation complete!",
        description: `Created ${data.stats.leadsCreated} new leads.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Lead generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const toggleCity = (city: string) => {
    setSelectedCities(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const toggleNiche = (niche: string) => {
    setSelectedNiches(prev => 
      prev.includes(niche) 
        ? prev.filter(n => n !== niche)
        : [...prev, niche]
    );
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  const estimatedSearches = selectedCities.length * selectedNiches.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Run Lead Generation
          </DialogTitle>
          <DialogDescription>
            Search for potential drone photography clients in your target markets.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Generation Complete!</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold">{result.searchesPerformed}</div>
                <div className="text-muted-foreground">Searches</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold">{result.rawResultsFound}</div>
                <div className="text-muted-foreground">Results Found</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold">{result.duplicatesFiltered}</div>
                <div className="text-muted-foreground">Duplicates</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">{result.leadsCreated}</div>
                <div className="text-muted-foreground">New Leads</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold">{result.emailsFound}</div>
                <div className="text-muted-foreground">Emails Found</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold">{result.aiDraftsGenerated}</div>
                <div className="text-muted-foreground">AI Drafts</div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground text-center">
              Estimated cost: ${result.estimatedCost.toFixed(2)}
            </div>

            <Button onClick={handleClose} className="w-full">
              View Leads
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Cities */}
            <div className="space-y-3">
              <Label>Target Cities</Label>
              <div className="flex flex-wrap gap-2">
                {defaultCities.map(city => (
                  <Badge
                    key={city}
                    variant={selectedCities.includes(city) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCity(city)}
                  >
                    {city}
                    {selectedCities.includes(city) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Niches */}
            <div className="space-y-3">
              <Label>Industry Niches</Label>
              <div className="flex flex-wrap gap-2">
                {defaultNiches.map(niche => (
                  <Badge
                    key={niche}
                    variant={selectedNiches.includes(niche) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleNiche(niche)}
                  >
                    {niche}
                    {selectedNiches.includes(niche) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Results per search */}
            <div className="space-y-2">
              <Label>Results per Search</Label>
              <Input
                type="number"
                value={resultsPerSearch}
                onChange={(e) => setResultsPerSearch(parseInt(e.target.value) || 10)}
                min={5}
                max={20}
              />
            </div>

            {/* Estimate */}
            <div className="bg-muted rounded-lg p-4 text-sm">
              <div className="font-medium mb-2">Estimated Search Scope</div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>{selectedCities.length} cities</div>
                <div>{selectedNiches.length} niches</div>
                <div>{estimatedSearches} total searches</div>
                <div>~{estimatedSearches * resultsPerSearch} max results</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || selectedCities.length === 0 || selectedNiches.length === 0}
                className="flex-1"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Leads
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
