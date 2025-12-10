import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calculator, Check } from "lucide-react";
import { Link } from "react-router-dom";

const tiers = [
  { id: "basic", name: "Basic Information Website", price: 350, licensing: 0 },
  { id: "starter", name: "Business Website Starter", price: 650, licensing: 19 },
  { id: "catalog", name: "B2B Catalog & CRM", price: 1100, licensing: 39 },
  { id: "b2b", name: "Full B2B Ordering System", price: 1950, licensing: 69 },
];

const addOns = [
  { id: "payments", name: "Online Payments Integration", price: 250 },
  { id: "booking", name: "Appointment & Booking Module", price: 150 },
  { id: "compliance", name: "Compliance & COA Module", price: 300 },
  { id: "marketplace", name: "Marketplace Module", price: 1150 },
  { id: "crm", name: "CRM Automation Package", price: 250 },
  { id: "email", name: "Custom Email Templates", price: 100 },
];

const supportPlans = [
  { id: "none", name: "No Support Plan", price: 0 },
  { id: "basic", name: "Basic Support", price: 59 },
  { id: "standard", name: "Standard Support", price: 99 },
  { id: "full", name: "Full Support", price: 199 },
  { id: "enterprise", name: "Enterprise Support", price: 499 },
];

export default function PricingCalculator() {
  const [selectedTier, setSelectedTier] = useState("starter");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedSupport, setSelectedSupport] = useState("none");
  const [includeLicensing, setIncludeLicensing] = useState(false);

  const totals = useMemo(() => {
    const tier = tiers.find((t) => t.id === selectedTier)!;
    const addOnsTotal = selectedAddOns.reduce((sum, id) => {
      const addOn = addOns.find((a) => a.id === id);
      return sum + (addOn?.price || 0);
    }, 0);
    const support = supportPlans.find((s) => s.id === selectedSupport)!;
    const monthlyLicensing = includeLicensing ? tier.licensing : 0;

    return {
      oneTime: tier.price + addOnsTotal,
      monthly: monthlyLicensing + support.price,
      tierPrice: tier.price,
      addOnsTotal,
      licensingFee: monthlyLicensing,
      supportFee: support.price,
    };
  }, [selectedTier, selectedAddOns, selectedSupport, includeLicensing]);

  const handleAddOnToggle = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const selectedTierData = tiers.find((t) => t.id === selectedTier);

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calculator className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl">Pricing Calculator</CardTitle>
        </div>
        <p className="text-muted-foreground text-sm">
          Build your custom solution and see the estimated cost
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Tier Selection */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">1. Select Your Tier</Label>
          <RadioGroup value={selectedTier} onValueChange={setSelectedTier}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tiers.map((tier) => (
                <div key={tier.id} className="relative">
                  <RadioGroupItem
                    value={tier.id}
                    id={tier.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={tier.id}
                    className="flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50 bg-background"
                  >
                    <div>
                      <p className="font-medium">{tier.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${tier.price.toLocaleString()} one-time
                        {tier.licensing > 0 && (
                          <span className="ml-2 text-xs">
                            (+${tier.licensing}/mo optional)
                          </span>
                        )}
                      </p>
                    </div>
                    {selectedTier === tier.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          {/* Optional Licensing */}
          {selectedTierData && selectedTierData.licensing > 0 && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
              <Checkbox
                id="licensing"
                checked={includeLicensing}
                onCheckedChange={(checked) =>
                  setIncludeLicensing(checked as boolean)
                }
              />
              <Label htmlFor="licensing" className="cursor-pointer">
                Include optional licensing (${selectedTierData.licensing}/month
                for ongoing updates & support eligibility)
              </Label>
            </div>
          )}
        </div>

        {/* Add-Ons Selection */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">2. Add-On Modules</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {addOns.map((addOn) => (
              <div
                key={addOn.id}
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedAddOns.includes(addOn.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 bg-background"
                }`}
                onClick={() => handleAddOnToggle(addOn.id)}
              >
                <Checkbox
                  id={addOn.id}
                  checked={selectedAddOns.includes(addOn.id)}
                  onCheckedChange={() => handleAddOnToggle(addOn.id)}
                />
                <Label htmlFor={addOn.id} className="flex-1 cursor-pointer">
                  <p className="font-medium">{addOn.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ${addOn.price.toLocaleString()}
                  </p>
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Support Plan Selection */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">3. Support Plan</Label>
          <RadioGroup value={selectedSupport} onValueChange={setSelectedSupport}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {supportPlans.map((plan) => (
                <div key={plan.id} className="relative">
                  <RadioGroupItem
                    value={plan.id}
                    id={`support-${plan.id}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`support-${plan.id}`}
                    className="flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50 bg-background text-center"
                  >
                    <p className="font-medium text-sm">{plan.name}</p>
                    <p className="text-lg font-bold text-primary">
                      {plan.price === 0 ? "—" : `$${plan.price}/mo`}
                    </p>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Total Summary */}
        <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-center">
            Estimated Investment
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* One-Time Costs */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                One-Time Setup
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Base Tier</span>
                  <span>${totals.tierPrice.toLocaleString()}</span>
                </div>
                {totals.addOnsTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Add-Ons ({selectedAddOns.length})</span>
                    <span>${totals.addOnsTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-primary/20">
                  <span>Total One-Time</span>
                  <span className="text-primary">
                    ${totals.oneTime.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Costs */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Monthly (Optional)
              </p>
              <div className="space-y-1 text-sm">
                {totals.licensingFee > 0 && (
                  <div className="flex justify-between">
                    <span>Licensing</span>
                    <span>${totals.licensingFee}/mo</span>
                  </div>
                )}
                {totals.supportFee > 0 && (
                  <div className="flex justify-between">
                    <span>Support Plan</span>
                    <span>${totals.supportFee}/mo</span>
                  </div>
                )}
                {totals.monthly === 0 && (
                  <p className="text-muted-foreground italic">
                    No recurring fees selected
                  </p>
                )}
                {totals.monthly > 0 && (
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-primary/20">
                    <span>Total Monthly</span>
                    <span className="text-primary">${totals.monthly}/mo</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 text-center">
            <Button asChild size="lg" className="px-8">
              <Link to="/request-service?service=WEBSITE">
                Request a Proposal
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Final pricing depends on project scope after consultation
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
