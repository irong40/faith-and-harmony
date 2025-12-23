import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShotGlossary } from "@/components/aerial/ShotGlossary";
import { PackageCard } from "@/components/aerial/PackageCard";
import { RetainerCard } from "@/components/aerial/RetainerCard";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Camera, MapPin, FileCheck, DollarSign, Info } from "lucide-react";
import aerialImage from "@/assets/services/aerial.png";

const realEstatePackages = [
  {
    code: "PHOTO_299",
    name: "Aerial Photo Pack",
    price: 299,
    turnaround: "48 hours",
    deliverables: { photos: 12, videos: 0, raw_included: false },
    delivery_formats: ["MLS-ready", "High-resolution"],
    shot_manifest: [
      { name: "Front hero oblique", count: 1 },
      { name: "Front-left oblique", count: 1 },
      { name: "Front-right oblique", count: 1 },
      { name: "Rear oblique showing backyard", count: 1 },
      { name: "Side angles for structure coverage", count: 2 },
      { name: "Top-down lot views", count: 2 },
      { name: "Neighborhood context", count: 2 },
      { name: "Feature detail", count: 1 }
    ],
    category: "real_estate" as const
  },
  {
    code: "PHOTO_VIDEO_699",
    name: "Aerial Photo + Highlight Video",
    price: 699,
    turnaround: "72 hours",
    deliverables: { photos: 20, videos: 1, raw_included: false },
    delivery_formats: ["MLS-ready", "High-resolution", "1080p Video"],
    shot_manifest: [
      { name: "Front hero oblique", count: 1 },
      { name: "Front corners", count: 2 },
      { name: "Rear corners or backyard hero", count: 2 },
      { name: "Side coverage angles", count: 2 },
      { name: "Top-down lot views", count: 3 },
      { name: "Neighborhood context", count: 3 },
      { name: "Feature details", count: 3 },
      { name: "Approach shots", count: 4 }
    ],
    video_clips: [
      { name: "Reveal clip (front)", required: true },
      { name: "Orbit clip (partial or full)", required: true },
      { name: "Rear pull-away (backyard feature)", required: true },
      { name: "Context pass", required: true },
      { name: "Feature inserts (2)", required: true }
    ],
    video_duration: "60-90 seconds",
    category: "real_estate" as const,
    featured: true
  },
  {
    code: "PREMIUM_1250",
    name: "Premium Listing Media",
    price: 1250,
    turnaround: "3-4 business days",
    deliverables: { photos: 30, videos: 1, raw_included: true },
    delivery_formats: ["MLS-ready", "High-resolution", "1080p Video", "Raw footage"],
    shot_manifest: [
      { name: "Full exterior coverage (all sides)", count: 10, type: "aerial" },
      { name: "Top-down lot and layout set", count: 5, type: "aerial" },
      { name: "Context set", count: 5, type: "aerial" },
      { name: "Front elevation hero", count: 2, type: "ground" },
      { name: "Front approach details", count: 2, type: "ground" },
      { name: "Backyard and outdoor living highlights", count: 4, type: "ground" },
      { name: "Feature details", count: 2, type: "ground" }
    ],
    video_structure: [
      "Front reveal",
      "Orbit coverage",
      "Backyard feature sequence",
      "Context sequence",
      "Closing hero pull-away"
    ],
    video_duration: "2-3 minutes",
    category: "real_estate" as const
  }
];

const constructionPackage = {
  code: "PROGRESS_450",
  name: "Progress Visit",
  price: 450,
  turnaround: "48 hours",
  deliverables: { photos: 25, videos: 4, raw_included: false },
  delivery_formats: ["Labeled photos", "Date-stamped folder structure"],
  shot_manifest: [
    { name: "Four-corner obliques from compass points", count: 4 },
    { name: "Perimeter coverage", count: 10 },
    { name: "Nadir overviews of work zones", count: 4 },
    { name: "Logistics and staging areas", count: 3 },
    { name: "Targeted detail photos of workfaces", count: 4 }
  ],
  video_clips: [
    { name: "Site overview pass", duration: "10-20 seconds" },
    { name: "Workface close pass", duration: "10-20 seconds" },
    { name: "Materials and staging pass", duration: "10-20 seconds" },
    { name: "Access and safety perspective pass", duration: "10-20 seconds" }
  ],
  category: "construction" as const
};

const retainerOptions = [
  {
    code: "RETAINER_1_MONTH",
    name: "Monthly (1 visit)",
    price: 1200,
    price_per_visit: 1200,
    visits_per_month: 1,
    turnaround: "48 hours per visit",
    deliverables: { photos: 25, videos: 4, raw_included: false }
  },
  {
    code: "RETAINER_2_MONTH",
    name: "Monthly (2 visits)",
    price: 2100,
    price_per_visit: 1050,
    visits_per_month: 2,
    turnaround: "48 hours per visit",
    deliverables: { photos: 25, videos: 4, raw_included: false },
    featured: true
  },
  {
    code: "RETAINER_WEEKLY",
    name: "Weekly",
    price: 3000,
    price_per_visit: 750,
    visits_per_month: 4,
    turnaround: "48 hours per visit",
    deliverables: { photos: 25, videos: 4, raw_included: false }
  }
];

const addOns = [
  { code: "CHANGE_ORDER", name: "Change-order support photo set", price: 150, description: "Extra 10 labeled photos" },
  { code: "RECAP_VIDEO", name: "End-of-month recap video", price: 350, description: "60-90 second recap" }
];

const AerialPhotography = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Hero Section */}
        <section className="py-12 md:py-16 text-center">
          <img src={aerialImage} alt="Aerial Photography" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-5 shadow-lg" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary font-display">
            Aerial Photography & Inspections
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-3xl mx-auto leading-relaxed">
            FAA Part 107 certified drone services for real estate, construction progress, and property documentation.
          </p>
          <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent rounded-full px-5 py-2.5">
            <span className="text-accent font-bold text-lg">Starting at $299</span>
          </div>
        </section>

        {/* Shot Glossary */}
        <section className="mb-12">
          <ShotGlossary />
        </section>

        {/* Real Estate Packages */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3">Real Estate</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-primary font-display">Real Estate Packages</h2>
            <p className="text-muted-foreground mt-2">Professional aerial media for property listings</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {realEstatePackages.map((pkg) => (
              <PackageCard key={pkg.code} {...pkg} />
            ))}
          </div>
        </section>

        {/* Construction Packages */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3">Construction</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-primary font-display">Construction Packages</h2>
            <p className="text-muted-foreground mt-2">Document progress with consistent, labeled deliverables</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Single Visit */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-primary font-display">{constructionPackage.name}</h3>
                  <p className="text-sm text-muted-foreground">Single visit documentation</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-primary">${constructionPackage.price}</span>
                  <p className="text-sm text-muted-foreground">{constructionPackage.turnaround}</p>
                </div>
              </div>
              
              <div className="flex gap-4 mb-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-accent" />
                  <span>{constructionPackage.deliverables.photos} labeled photos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs">4 video clips</Badge>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-semibold text-primary mb-2">Photo Coverage:</p>
                  <ul className="space-y-1.5 text-sm text-card-foreground">
                    {constructionPackage.shot_manifest.map((shot, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                        {shot.name} ({shot.count})
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary mb-2">Video Clips:</p>
                  <ul className="space-y-1.5 text-sm text-card-foreground">
                    {constructionPackage.video_clips?.map((clip, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                        {clip.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                to={`/request-service?service=AERIAL&package=${constructionPackage.code}`}
                className="block w-full text-center py-3 px-4 rounded-full font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                Book Single Visit
              </Link>
            </div>

            {/* Retainer Options */}
            <div>
              <h3 className="text-lg font-bold text-primary mb-4">Monthly Retainer Options</h3>
              <p className="text-sm text-muted-foreground mb-4">Same deliverables per visit, committed scheduling</p>
              <div className="space-y-4">
                {retainerOptions.map((retainer) => (
                  <RetainerCard key={retainer.code} {...retainer} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Add-ons */}
        <section className="mb-16">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
            <h3 className="text-lg font-bold text-primary mb-4">Add-ons (Construction)</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {addOns.map((addon) => (
                <div key={addon.code} className="flex items-center justify-between p-4 bg-background rounded-xl border border-border/50">
                  <div>
                    <p className="font-semibold text-primary">{addon.name}</p>
                    <p className="text-sm text-muted-foreground">{addon.description}</p>
                  </div>
                  <span className="text-lg font-bold text-accent">+${addon.price}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Standard Note */}
        <section className="mb-16">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex gap-4">
            <Info className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary mb-1">Shot Plan Commitment</p>
              <p className="text-sm text-muted-foreground">
                We deliver the shot list shown above. If conditions prevent a specific shot due to safety, airspace limits, weather, or on-site activity, we substitute an equivalent shot that provides the same business value.
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-primary text-center font-display">Why Choose Us</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Shield, title: "FAA Certified", description: "Part 107 certified pilot for legal, safe operations." },
              { icon: Camera, title: "Pro Equipment", description: "High-resolution cameras for stunning results." },
              { icon: Clock, title: "Quick Turnaround", description: "48-72 hour delivery on most packages." },
              { icon: MapPin, title: "Hampton Roads Based", description: "Serving Virginia Beach, Norfolk, Chesapeake & beyond." },
              { icon: FileCheck, title: "Detailed Reports", description: "Professional inspection reports when needed." },
              { icon: DollarSign, title: "Transparent Pricing", description: "Fixed packages with no hidden fees." }
            ].map((item, index) => (
              <div key={index} className="bg-card rounded-xl p-5 shadow-md border border-border hover:shadow-lg transition-shadow">
                <item.icon className="w-8 h-8 text-accent mb-3" />
                <h3 className="font-bold text-primary mb-1">{item.title}</h3>
                <p className="text-sm text-card-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-20 text-center">
          <h2 className="text-3xl font-bold mb-4 text-primary font-display">Ready for a New Perspective?</h2>
          <p className="text-lg text-muted-foreground mb-8">Choose a package above or let's discuss your specific needs.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/request-service?service=AERIAL" 
              className="px-8 py-3.5 bg-accent text-accent-foreground font-semibold rounded-full hover:opacity-90 transition-all shadow-lg"
            >
              Request Custom Quote
            </Link>
            <Link to="/services" className="px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-all shadow-lg">
              View All Services
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default AerialPhotography;
