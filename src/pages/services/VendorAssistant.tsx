import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const VendorAssistant = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <div className="text-6xl mb-6">🧾</div>
          <h1 className="text-5xl font-bold mb-6 text-primary font-display">
            Vendor Assistant Systems for Events
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            Automate your event operations with smart tools for intake, payments, and inventory tracking.
          </p>
          <div className="inline-block bg-accent/20 border border-accent rounded-full px-6 py-3">
            <span className="text-accent font-bold text-lg">Starting at $450 per event</span>
          </div>
        </section>

        {/* What We Offer */}
        <section className="mb-16 bg-card rounded-3xl p-10 shadow-xl border border-border">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">What We Offer</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Digital Intake Forms</h3>
                <p className="text-card-foreground">Custom forms that capture attendee information and sync with your systems automatically.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">QR Code Systems</h3>
                <p className="text-card-foreground">Generate and manage QR codes for check-in, payments, and information sharing.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Payment Links</h3>
                <p className="text-card-foreground">Secure payment processing for tickets, merchandise, and services.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Inventory Tracking</h3>
                <p className="text-card-foreground">Real-time tracking of merchandise, supplies, and equipment.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Reporting & Analytics</h3>
                <p className="text-card-foreground">Post-event reports with attendance, revenue, and engagement metrics.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Event Types */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Events We Support</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Conferences", description: "Registration, session tracking, and networking facilitation." },
              { title: "Church Events", description: "Revival meetings, anniversaries, and community gatherings." },
              { title: "Festivals", description: "Vendor management, ticket sales, and crowd flow." },
              { title: "Pop-up Markets", description: "Vendor coordination and transaction processing." },
              { title: "Private Events", description: "Weddings, reunions, and milestone celebrations." },
              { title: "Community Programs", description: "Workshops, classes, and civic engagements." }
            ].map((item, index) => (
              <div key={index} className="bg-card rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-bold text-primary mb-3">{item.title}</h3>
                <p className="text-card-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="mb-16 bg-primary rounded-3xl p-10 shadow-2xl">
          <h2 className="text-4xl font-bold mb-8 text-center font-display text-primary-foreground">Why Choose Our System?</h2>
          <div className="grid md:grid-cols-3 gap-8 text-secondary">
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Save Time</h3>
              <p className="opacity-90">Automation handles repetitive tasks so you can focus on your guests.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Reduce Errors</h3>
              <p className="opacity-90">Digital systems eliminate manual data entry mistakes.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Professional Experience</h3>
              <p className="opacity-90">Give your attendees a modern, seamless event experience.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary font-display">Ready to Elevate Your Events?</h2>
          <p className="text-xl text-muted-foreground mb-8">Let's build a system that makes your next event run smoothly.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              to="/request-service?service=VENDOR_ASSISTANT" 
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
    </div>
  );
};

export default VendorAssistant;
