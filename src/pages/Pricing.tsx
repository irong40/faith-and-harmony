import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus } from "lucide-react";

const tiers = [
  {
    name: "Basic Information Website",
    price: "$350",
    priceSubtext: "one-time setup",
    licensing: null,
    features: [
      "Home, About, Services or Offerings, Contact (static)",
      "Mobile friendly layout",
      "Branding and color palette setup",
      "Deployment to client hosting",
      "No CMS, no database, no automations",
    ],
    footerText: "Best for clients who need a simple online identity",
    highlighted: false,
  },
  {
    name: "Business Website Starter",
    price: "$650",
    priceSubtext: "one-time setup",
    licensing: "$19/month optional",
    features: [
      "Home, About, Contact, Services pages",
      "Product or portfolio listing (up to 20 items)",
      "Lead capture stored in admin dashboard",
      "Mobile optimization",
      "Branding, colors, logo setup",
      "Deployment to client hosting",
      "One hour of training and handoff",
    ],
    footerText: "Optional licensing available",
    highlighted: false,
  },
  {
    name: "B2B Catalog & CRM",
    price: "$1,100",
    priceSubtext: "one-time setup",
    licensing: "$39/month optional",
    features: [
      "Everything in Starter plus:",
      "Unlimited products",
      "Categories and tags",
      "Product detail pages",
      "Wholesale application form",
      "Lead tracking dashboard",
      "Basic inventory counts",
      "COA upload tools",
      "Automated email notifications",
      "Admin dashboard configuration",
    ],
    footerText: "Optional licensing available",
    highlighted: true,
  },
  {
    name: "Full B2B Ordering System",
    price: "$1,950",
    priceSubtext: "one-time setup",
    licensing: "$69/month optional",
    features: [
      "Everything in B2B Catalog plus:",
      "Retailer login portal",
      "Pricing tiers",
      "Cart and order submission",
      "Retailer order history",
      "Admin order management",
      "SKU and variant setup",
      "Inventory adjustment tools",
      "COA management",
      "Two training sessions",
    ],
    footerText: "Optional licensing available",
    highlighted: false,
  },
];

const comparisonFeatures = [
  { feature: "Static pages", basic: true, starter: true, catalog: true, ordering: true },
  { feature: "CMS & Dashboard", basic: false, starter: true, catalog: true, ordering: true },
  { feature: "Database", basic: false, starter: true, catalog: true, ordering: true },
  { feature: "Lead capture / CRM", basic: false, starter: true, catalog: true, ordering: true },
  { feature: "Product management", basic: false, starter: "Up to 20", catalog: "Unlimited", ordering: "Unlimited" },
  { feature: "Automations", basic: false, starter: false, catalog: true, ordering: true },
  { feature: "Retailer portal", basic: false, starter: false, catalog: false, ordering: true },
  { feature: "Order management", basic: false, starter: false, catalog: false, ordering: true },
  { feature: "Training included", basic: false, starter: "1 hour", catalog: "1 hour", ordering: "2 sessions" },
];

const addOns = [
  { name: "Online Payments Integration", price: "$250" },
  { name: "Appointment & Booking Module", price: "$150" },
  { name: "Compliance & COA Module", price: "$300" },
  { name: "Marketplace Module", price: "$1,150" },
  { name: "CRM Automation Package", price: "$250" },
  { name: "Custom Email Templates", price: "$100" },
  { name: "AI Image Cleanup", price: "$15/image • $250/25 images • $400/50 images" },
];

const supportPlans = [
  {
    name: "Basic Support",
    price: "$59",
    period: "/month",
    features: [
      "Up to 30 minutes of updates",
      "Basic content updates",
      "Email support",
    ],
  },
  {
    name: "Standard Support",
    price: "$99",
    period: "/month",
    features: [
      "Up to 2 hours of updates",
      "Product additions and removals",
      "Workflow tuning",
      "Priority email support",
    ],
  },
  {
    name: "Full Support",
    price: "$199",
    period: "/month",
    features: [
      "Up to 5 hours of updates",
      "Feature adjustments within current design",
      "Quarterly performance review",
      "Accelerated response",
    ],
  },
  {
    name: "Enterprise Support",
    price: "$499",
    period: "/month",
    features: [
      "Up to 10 hours of updates and enhancements",
      "Maintenance and optimization",
      "Quarterly strategic feature review",
      "Highest priority response",
      "Additional hours at $75/hour",
    ],
  },
];

const whyChooseUs = [
  "Systems designed around real business workflows",
  "Clear one-time pricing",
  "Optional licensing for long-term updates",
  "Predictable, structured support",
  "No platform lock-in",
  "Modular expansion options",
];

const nextSteps = [
  "Select desired tier",
  "Add optional modules",
  "Choose a support plan",
  "Receive proposal and timeline",
  "Project begins upon acceptance",
];

export default function Pricing() {
  const renderComparisonCell = (value: boolean | string) => {
    if (value === true) return <Check className="h-5 w-5 text-accent mx-auto" />;
    if (value === false) return <X className="h-5 w-5 text-muted-foreground/50 mx-auto" />;
    return <span className="text-sm text-foreground">{value}</span>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Faith and Harmony Web Systems
            </h1>
            <p className="text-xl md:text-2xl mb-4 opacity-90">
              Professional Website and B2B Commerce Solutions
            </p>
            <p className="text-base md:text-lg opacity-80">
              Clear one-time pricing with optional licensing and support.
            </p>
          </div>
        </section>

        {/* Tiered Pricing Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={`flex flex-col ${
                    tier.highlighted
                      ? "border-accent shadow-lg ring-2 ring-accent"
                      : "border-border"
                  }`}
                >
                  <CardHeader className="text-center pb-4">
                    {tier.highlighted && (
                      <Badge className="w-fit mx-auto mb-2 bg-accent text-accent-foreground">
                        Most Popular
                      </Badge>
                    )}
                    <CardTitle className="text-lg font-display leading-tight min-h-[3rem] flex items-center justify-center">
                      {tier.name}
                    </CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-foreground">
                        {tier.price}
                      </span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        {tier.priceSubtext}
                      </span>
                    </div>
                    {tier.licensing ? (
                      <p className="text-sm text-accent font-medium mt-2">
                        {tier.licensing}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">
                        No monthly platform fee
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3 pt-4">
                    <Link to="/request-service?service=WEBSITE" className="w-full">
                      <Button className="w-full" size="lg">
                        Request a Quote
                      </Button>
                    </Link>
                    <p className="text-xs text-muted-foreground text-center">
                      {tier.footerText}
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Tier Comparison Section */}
        <section className="py-16 md:py-24 bg-secondary">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
              Tier Comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-card rounded-xl border border-border">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-semibold text-foreground">Feature</th>
                    <th className="text-center p-4 font-semibold text-foreground">Basic</th>
                    <th className="text-center p-4 font-semibold text-foreground">Starter</th>
                    <th className="text-center p-4 font-semibold text-foreground bg-accent/10">Catalog</th>
                    <th className="text-center p-4 font-semibold text-foreground">B2B Ordering</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, index) => (
                    <tr key={row.feature} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                      <td className="p-4 text-sm text-foreground font-medium">{row.feature}</td>
                      <td className="p-4 text-center">{renderComparisonCell(row.basic)}</td>
                      <td className="p-4 text-center">{renderComparisonCell(row.starter)}</td>
                      <td className="p-4 text-center bg-accent/5">{renderComparisonCell(row.catalog)}</td>
                      <td className="p-4 text-center">{renderComparisonCell(row.ordering)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Add-On Modules Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
              Add-On Modules
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {addOns.map((addon) => (
                <Card key={addon.name} className="bg-card">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-2">
                      {addon.name}
                    </h3>
                    <p className="text-sm text-accent font-medium">
                      {addon.price}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Support Plans Section */}
        <section className="py-16 md:py-24 bg-secondary">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
              Support Plans (Optional)
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Keep your system running smoothly with ongoing support and updates.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {supportPlans.map((plan) => (
                <Card key={plan.name} className="flex flex-col bg-card">
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg font-display">
                      {plan.name}
                    </CardTitle>
                    <div className="mt-3">
                      <span className="text-3xl font-bold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pt-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-8">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
              Why Clients Choose Us
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {whyChooseUs.map((reason) => (
                <div key={reason} className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
                  <Check className="h-5 w-5 text-accent shrink-0" />
                  <span className="text-foreground">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
              Next Steps
            </h2>
            <div className="flex flex-col items-center gap-3 mb-8">
              {nextSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="text-lg opacity-90">{step}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Contact Us
                </Button>
              </Link>
              <Link to="/request-service?service=WEBSITE">
                <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                  Request a Project Consultation
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}