import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Camera, Building2, Plus, Clock,
  DollarSign, Package, Zap, CalendarDays, Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PricingEngine from '@/components/PricingEngine';

const RESIDENTIAL_PACKAGES = [
  {
    name: 'Listing Lite',
    price: 225,
    code: 're_basic',
    features: ['10 photos', 'Sky replacement', 'Next day delivery'],
  },
  {
    name: 'Listing Pro',
    price: 450,
    code: 're_standard',
    features: ['25 photos', '60 second reel', '2D boundary overlay', '48 hour turnaround'],
  },
  {
    name: 'Luxury Listing',
    price: 750,
    code: 're_premium',
    features: ['40+ photos', '2 minute cinematic video', 'Twilight shoot', '24 hour priority'],
  },
];

const COMMERCIAL_PACKAGES = [
  {
    name: 'Construction Progress',
    price: 450,
    code: 'construction',
    unit: '/visit',
    features: ['Orthomosaic', 'Site overview', 'Date stamped archive'],
  },
  {
    name: 'Commercial Marketing',
    price: 850,
    code: 'commercial',
    unit: '',
    features: ['4K video', '3D model', 'Raw footage', 'Perpetual license'],
  },
  {
    name: 'Inspection Data',
    price: 1200,
    code: 'inspection',
    unit: '',
    features: ['Inspection grid photography', 'Annotated report', 'Exportable data'],
  },
];

const ADD_ONS = [
  { name: 'Rush Premium (24hr)', modifier: '+25%' },
  { name: 'Rush Premium (Same Day)', modifier: '+50%' },
  { name: 'Raw File Buyout', modifier: '+$250' },
];

const RETAINER_PLAN = {
  name: 'Brokerage Retainer',
  price: 1500,
  period: 'month',
  includes: '5 Listing Pro shoots',
  policy: 'Use it or lose it',
};

interface Retainer {
  id: string;
  client_name: string;
  status: 'active' | 'paused' | 'canceled';
  monthly_rate: number;
  shoots_included: number;
  shoots_used: number;
  start_date: string;
  next_billing_date: string;
}

function RetainerCard({ retainer }: { retainer: Retainer }) {
  const remaining = retainer.shoots_included - retainer.shoots_used;
  const usagePct = (retainer.shoots_used / retainer.shoots_included) * 100;

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold">{retainer.client_name}</span>
            <Badge
              className={
                retainer.status === 'active'
                  ? 'ml-2 bg-green-500 text-white'
                  : retainer.status === 'paused'
                  ? 'ml-2 bg-amber-500 text-white'
                  : 'ml-2 bg-gray-500 text-white'
              }
            >
              {retainer.status}
            </Badge>
          </div>
          <span className="font-mono text-lg font-bold">${retainer.monthly_rate.toLocaleString()}/mo</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Shoots used this period</span>
            <span>{retainer.shoots_used} / {retainer.shoots_included}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePct >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{remaining} remaining</span>
            <span>Resets {new Date(retainer.next_billing_date).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Started {new Date(retainer.start_date).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function PackageCard({ name, price, unit, features, code }: {
  name: string;
  price: number;
  unit?: string;
  features: string[];
  code: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{name}</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">{code}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <ul className="space-y-1 mb-4">
          {features.map(f => (
            <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <div className="text-2xl font-bold font-mono">
          ${price.toLocaleString()}
          {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SentinelPricing() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addRetainerOpen, setAddRetainerOpen] = useState(false);
  const [retainerForm, setRetainerForm] = useState({
    client_name: '',
    monthly_rate: '1500',
    shoots_included: '5',
    start_date: new Date().toISOString().split('T')[0],
  });

  const { data: retainers, isLoading: loadingRetainers } = useQuery({
    queryKey: ['retainers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retainers')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) {
        // Table may not exist yet, return empty
        console.warn('Retainers table not found, showing empty list');
        return [] as Retainer[];
      }
      return data as Retainer[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createRetainer = useMutation({
    mutationFn: async () => {
      const startDate = new Date(retainerForm.start_date);
      const nextBilling = new Date(startDate);
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      const { data, error } = await supabase
        .from('retainers')
        .insert({
          client_name: retainerForm.client_name,
          status: 'active',
          monthly_rate: parseInt(retainerForm.monthly_rate),
          shoots_included: parseInt(retainerForm.shoots_included),
          shoots_used: 0,
          start_date: retainerForm.start_date,
          next_billing_date: nextBilling.toISOString().split('T')[0],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retainers'] });
      toast({ title: 'Retainer created' });
      setAddRetainerOpen(false);
      setRetainerForm({ client_name: '', monthly_rate: '1500', shoots_included: '5', start_date: new Date().toISOString().split('T')[0] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create retainer', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Sentinel Pricing & Billing</h1>
            <p className="text-xs text-muted-foreground">Service packages, retainers, and quote builder</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Tabs defaultValue="packages">
          <TabsList className="mb-6">
            <TabsTrigger value="packages" className="gap-1">
              <Package className="h-4 w-4" /> Packages
            </TabsTrigger>
            <TabsTrigger value="retainers" className="gap-1">
              <Users className="h-4 w-4" /> Retainers
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-1">
              <DollarSign className="h-4 w-4" /> Quote Calculator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="space-y-8">
            {/* Residential */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Camera className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Residential Packages</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {RESIDENTIAL_PACKAGES.map(p => (
                  <PackageCard key={p.code} {...p} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Commercial */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Commercial Packages</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {COMMERCIAL_PACKAGES.map(p => (
                  <PackageCard key={p.code} {...p} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Add-ons */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Add-ons</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ADD_ONS.map(a => (
                  <Card key={a.name}>
                    <CardContent className="pt-4 flex items-center justify-between">
                      <span className="text-sm">{a.name}</span>
                      <Badge variant="secondary" className="font-mono">{a.modifier}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Retainer plan info */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{RETAINER_PLAN.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {RETAINER_PLAN.includes}. {RETAINER_PLAN.policy}.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono">${RETAINER_PLAN.price.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">/{RETAINER_PLAN.period}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="retainers" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Active Retainers</h2>
              <Button size="sm" onClick={() => setAddRetainerOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Retainer
              </Button>
            </div>

            {loadingRetainers ? (
              <div className="flex items-center justify-center py-12">
                <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : retainers && retainers.length > 0 ? (
              <div className="space-y-3">
                {retainers.map(r => (
                  <RetainerCard key={r.id} retainer={r} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active retainers</p>
                  <p className="text-xs mt-1">
                    The Brokerage Retainer plan is ${RETAINER_PLAN.price.toLocaleString()}/month for {RETAINER_PLAN.includes}.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Add Retainer Dialog */}
            <Dialog open={addRetainerOpen} onOpenChange={setAddRetainerOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Retainer Client</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Client / Brokerage Name *</Label>
                    <Input
                      value={retainerForm.client_name}
                      onChange={e => setRetainerForm(f => ({ ...f, client_name: e.target.value }))}
                      placeholder="Hampton Roads Realty Group"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Monthly Rate ($)</Label>
                      <Input
                        type="number"
                        value={retainerForm.monthly_rate}
                        onChange={e => setRetainerForm(f => ({ ...f, monthly_rate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Shoots Included</Label>
                      <Input
                        type="number"
                        value={retainerForm.shoots_included}
                        onChange={e => setRetainerForm(f => ({ ...f, shoots_included: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={retainerForm.start_date}
                      onChange={e => setRetainerForm(f => ({ ...f, start_date: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddRetainerOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createRetainer.mutate()}
                    disabled={!retainerForm.client_name.trim() || createRetainer.isPending}
                  >
                    Create Retainer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="calculator">
            <PricingEngine />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
