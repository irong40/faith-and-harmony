import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Business Website Starter",
    price: "$499",
    priceSubtext: "one-time setup",
    subtext: "No monthly platform fee",
    features: [
      "Home, About, Contact, and Services pages",
      "Product or portfolio listing (up to 20 items)",
      "Lead capture stored in admin dashboard",
      "Mobile-optimized layout",
      "Branding, colors, and logo setup",
      "Deployment to client's hosting provider",
      "1-hour training and handoff",
    ],
    footerText: "Optional support available",
    highlighted: false,
  },
  {
    name: "B2B Catalog & CRM",
    price: "$899",
    priceSubtext: "one-time setup",
    subtext: "No monthly platform fee",
    features: [
      "Everything in Starter",
      "Unlimited products",
      "Categories and tags",
      "Product detail pages",
      "Wholesale application form",
      "Lead tracking dashboard",
      "Basic inventory counts",
      "COA upload support",
      "Automated email notifications",
      "Admin dashboard configuration",
    ],
    footerText: "Optional support available",
    highlighted: true,
  },
  {
    name: "Full B2B Ordering System",
    price: "$1,500",
    priceSubtext: "one-time setup",
    subtext: "No monthly platform fee",
    features: [
      "Everything in B2B Catalog",
      "Retailer login portal",
      "Pricing tiers (Standard / Premium / VIP)",
      "Cart + order submission",
      "Retailer order history",
      "Admin order management",
      "SKU and variant setup",
      "Inventory adjustment tools",
      "COA management",
      "Two training sessions",
    ],
    footerText: "Optional support available",
    highlighted: false,
  },
];

const addOns = [
  { name: "Online Payments Integration", price: "$250 one-time" },
  { name: "Appointment & Booking Module", price: "$150 one-time" },
  { name: "Compliance & COA Module", price: "$300 one-time" },
  { name: "Marketplace Module", price: "$950 one-time" },
  { name: "CRM Automation Package", price: "$250 one-time" },
  { name: "Custom Email Templates", price: "$100 one-time" },
  { name: "AI Image Cleanup", price: "$15/image • $250/25 images • $400/50 images" },
];

const supportPlans = [
  {
    name: "Basic Support",
    price: "$59",
    period: "/month",
    features: [
      "Up to 30 minutes of edits",
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
      "Product additions/removals",
      "Workflow tuning",
    ],
  },
  {
    name: "Full Support",
    price: "$199",
    period: "/month",
    features: [
      "Up to 5 hours of updates",
      "Feature adjustments",
      "Priority response",
    ],
  },
  {
    name: "Enterprise Support",
    price: "$499",
    period: "/month",
    features: [
      "Unlimited edits",
      "Feature maintenance",
      "Quarterly enhancements",
      "Priority access",
    ],
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Pricing
            </h1>
            <p className="text-xl md:text-2xl mb-4 opacity-90">
              A complete B2B website and ordering system—without Shopify fees and without monthly platform charges.
            </p>
            <p className="text-base md:text-lg opacity-80">
              You get a fully deployed commercial system on your own hosting, with optional support and add-on capabilities.
            </p>
          </div>
        </section>

        {/* Tiered Pricing Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                    <CardTitle className="text-xl font-display">
                      {tier.name}
                    </CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">
                        {tier.price}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {tier.priceSubtext}
                      </span>
                    </div>
                    <p className="text-sm text-accent font-medium mt-2">
                      {tier.subtext}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4 pt-4">
                    <Link to="/request-service" className="w-full">
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

        {/* Add-On Modules Section */}
        <section className="py-16 md:py-24 bg-secondary">
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
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-8">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
              Support Plans (Optional)
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Keep your system running smoothly with ongoing support and updates.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {supportPlans.map((plan) => (
                <Card key={plan.name} className="flex flex-col">
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

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg opacity-90 mb-8">
              Choose the plan that fits your business and let us build a custom B2B experience on your own hosting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Contact Us
                </Button>
              </Link>
              <Link to="/request-service">
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
