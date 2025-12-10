import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, FileText } from "lucide-react";

const licensingFees = [
  { tier: "Starter Site", price: "$19", period: "per month" },
  { tier: "B2B Catalog", price: "$39", period: "per month" },
  { tier: "B2B Ordering System", price: "$69", period: "per month" },
];

const scopeIncludes = [
  "Platform updates",
  "Security and compatibility patches",
  "Framework version updates",
  "Maintenance of core system logic",
  "Performance improvements",
];

const clientResponsibilities = [
  "Maintain active payment for the license",
  "Host the platform on an approved provider",
  "Notify Faith and Harmony LLC of system issues promptly",
  "Avoid altering system source code without approval",
];

export default function Licensing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-20 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
            <FileText className="w-16 h-16 mx-auto mb-6 opacity-80" />
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Platform Licensing Agreement
            </h1>
            <p className="text-lg opacity-90">
              Faith and Harmony Web Systems
            </p>
          </div>
        </section>

        {/* Back to Pricing Link */}
        <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-8">
          <Link to="/pricing" className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Pricing</span>
          </Link>
        </div>

        {/* Agreement Content */}
        <section className="py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 space-y-8">
            
            {/* Introduction */}
            <Card>
              <CardContent className="p-6 md:p-8">
                <p className="text-foreground leading-relaxed">
                  This Platform Licensing Agreement governs the ongoing use, maintenance, and operation of the web system developed by Faith and Harmony LLC for the Client.
                </p>
              </CardContent>
            </Card>

            {/* Grant of License */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl text-primary">
                  Grant of License
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-foreground leading-relaxed">
                  Faith and Harmony LLC grants the Client a non-exclusive, non-transferable license to use the web platform, including its code base, admin dashboard, database structure, and proprietary workflow components.
                </p>
              </CardContent>
            </Card>

            {/* Scope of License */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl text-primary">
                  Scope of License
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <p className="text-foreground leading-relaxed">
                  The license covers:
                </p>
                <ul className="space-y-2">
                  {scopeIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground italic pt-2">
                  The license does not include custom development. Custom work is billed separately.
                </p>
              </CardContent>
            </Card>

            {/* Licensing Fees */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl text-primary">
                  Licensing Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <p className="text-foreground leading-relaxed">
                  Licensing fees are billed monthly and are tier-specific:
                </p>
                <div className="grid gap-3">
                  {licensingFees.map((fee) => (
                    <div key={fee.tier} className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
                      <span className="font-medium text-foreground">{fee.tier}</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-accent">{fee.price}</span>
                        <span className="text-muted-foreground text-sm ml-1">{fee.period}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground text-sm pt-2">
                  Fees are non-refundable and required for continuous system operation.
                </p>
              </CardContent>
            </Card>

            {/* Client Responsibilities */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl text-primary">
                  Client Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <p className="text-foreground leading-relaxed">
                  The Client agrees to:
                </p>
                <ul className="space-y-2">
                  {clientResponsibilities.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Term and Termination */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl text-primary">
                  Term and Termination
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-foreground leading-relaxed">
                  This license renews monthly until canceled.
                </p>
                <p className="text-foreground leading-relaxed">
                  Faith and Harmony LLC may suspend access if payments lapse.
                </p>
                <p className="text-foreground leading-relaxed">
                  Termination does not grant access to proprietary system updates, patches, or future enhancements.
                </p>
              </CardContent>
            </Card>

            {/* Ownership */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl text-primary">
                  Ownership
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-foreground leading-relaxed">
                  Faith and Harmony LLC retains all rights to system architecture, workflows, and proprietary components. The Client owns their content, branding, and domain.
                </p>
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl text-primary">
                  Support
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-foreground leading-relaxed">
                  Support is not included in the licensing fee. Support plans are optional and billed separately.
                </p>
              </CardContent>
            </Card>

            {/* Governing Law */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl text-primary">
                  Governing Law
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-foreground leading-relaxed">
                  This agreement is governed by the laws of the Commonwealth of Virginia.
                </p>
              </CardContent>
            </Card>

            {/* Acceptance Notice */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 md:p-8 text-center">
                <p className="text-foreground font-medium">
                  Client acceptance of services constitutes acceptance of this Agreement.
                </p>
              </CardContent>
            </Card>

            {/* Back to Pricing CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link to="/pricing">
                <Button size="lg" variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Pricing
                </Button>
              </Link>
              <Link to="/request-service?service=WEBSITE">
                <Button size="lg">
                  Request a Quote
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
