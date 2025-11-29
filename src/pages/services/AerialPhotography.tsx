import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AerialPhotography = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <div className="text-6xl mb-6">🚁</div>
          <h1 className="text-5xl font-bold mb-6 text-primary font-display">
            Aerial Photography & Inspections
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            FAA Part 107 certified drone services for real estate, land surveying, roof inspections, and more. See your property from a new perspective.
          </p>
          <div className="inline-block bg-accent/20 border border-accent rounded-full px-6 py-3">
            <span className="text-accent font-bold text-lg">Starting at $250 per project</span>
          </div>
        </section>

        {/* Services */}
        <section className="mb-16 bg-card rounded-3xl p-10 shadow-xl border border-border">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Our Services</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Real Estate Photography</h3>
                <p className="text-card-foreground">Stunning aerial views to showcase properties and attract buyers.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Land Parcel Documentation</h3>
                <p className="text-card-foreground">Comprehensive aerial documentation for land purchases and development planning.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Roof Inspections</h3>
                <p className="text-card-foreground">Safe, detailed roof assessments without ladders or scaffolding.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Agricultural Surveys</h3>
                <p className="text-card-foreground">Monitor crop health, irrigation, and land conditions from above.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Marine Photography</h3>
                <p className="text-card-foreground">Waterfront properties, boats, and coastal documentation.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Construction Progress</h3>
                <p className="text-card-foreground">Document construction projects from start to finish.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Why Choose Us</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "FAA Certified", description: "Part 107 certified pilot ensuring legal, safe, and professional operations." },
              { title: "High-Quality Equipment", description: "Professional-grade drones with high-resolution cameras for stunning results." },
              { title: "Quick Turnaround", description: "Fast delivery of edited photos and videos for your projects." },
              { title: "Flexible Scheduling", description: "We work around your schedule and weather conditions." },
              { title: "Detailed Reports", description: "Professional inspection reports with annotated findings when needed." },
              { title: "Competitive Pricing", description: "Quality aerial services at reasonable rates." }
            ].map((item, index) => (
              <div key={index} className="bg-card rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-bold text-primary mb-3">{item.title}</h3>
                <p className="text-card-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Service Area */}
        <section className="mb-16 bg-primary rounded-3xl p-10 shadow-2xl">
          <h2 className="text-4xl font-bold mb-8 text-center font-display text-primary-foreground">Service Area</h2>
          <div className="text-center text-secondary">
            <p className="text-xl mb-4 opacity-90">
              Serving the Hampton Roads, Virginia area and surrounding regions.
            </p>
            <p className="opacity-80">
              Travel available for larger projects—contact us for a quote.
            </p>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary font-display">Ready for a New Perspective?</h2>
          <p className="text-xl text-muted-foreground mb-8">Let's discuss your aerial photography or inspection needs.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              to="/request-service?service=AERIAL" 
              className="px-10 py-4 bg-gradient-to-r from-accent to-amber-400 text-primary font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Request This Service
            </Link>
            <Link to="/services" className="px-10 py-4 bg-primary text-primary-foreground font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
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
