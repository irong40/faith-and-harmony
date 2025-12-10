import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import websiteImage from "@/assets/services/website.png";

const WebsiteHosting = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <img src={websiteImage} alt="Website Hosting" className="w-24 h-24 rounded-2xl object-cover mx-auto mb-6 shadow-lg" />
          <h1 className="text-5xl font-bold mb-6 text-primary font-display">
            Website Hosting & Development
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            Professional web design, development, and hosting services. From simple landing pages to full e-commerce solutions.
          </p>
          <div className="inline-block bg-accent/20 border border-accent rounded-full px-6 py-3">
            <span className="text-accent font-bold text-lg">Starting at $350</span>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            <Link to="/pricing" className="text-accent hover:underline">See our pricing page</Link> for detailed tier information
          </p>
        </section>

        {/* Services */}
        <section className="mb-16 bg-card rounded-3xl p-10 shadow-xl border border-border">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">What We Offer</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Custom Website Design</h3>
                <p className="text-card-foreground">Unique designs that reflect your brand and connect with your audience.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Website Development</h3>
                <p className="text-card-foreground">Modern, responsive websites built with the latest technologies.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">E-Commerce Solutions</h3>
                <p className="text-card-foreground">Online stores with secure payment processing and inventory management.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Website Hosting</h3>
                <p className="text-card-foreground">Reliable, secure hosting with regular backups and maintenance.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Domain Management</h3>
                <p className="text-card-foreground">Help you secure and manage your perfect domain name.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Website Maintenance</h3>
                <p className="text-card-foreground">Ongoing updates, security patches, and content changes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Types of Websites */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Types of Websites We Build</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Business Websites", description: "Professional sites for small businesses and entrepreneurs." },
              { title: "Church Websites", description: "Ministry sites with sermon archives, event calendars, and giving options." },
              { title: "Portfolio Sites", description: "Showcase your work, art, or professional accomplishments." },
              { title: "E-Commerce Stores", description: "Sell products and services online with secure checkout." },
              { title: "Event Websites", description: "Promote events with registration and ticketing." },
              { title: "Personal Blogs", description: "Share your thoughts, stories, and expertise with the world." }
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
          <h2 className="text-4xl font-bold mb-8 text-center font-display text-primary-foreground">Why Choose Faith & Harmony?</h2>
          <div className="grid md:grid-cols-2 gap-8 text-secondary">
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">We Speak Your Language</h3>
              <p className="mb-6 opacity-90">No confusing tech jargon—we explain everything in terms you understand.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">You Own Everything</h3>
              <p className="opacity-90">Your website, your domain, your content. We don't hold anything hostage.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Ongoing Support</h3>
              <p className="mb-6 opacity-90">We don't disappear after launch. We're here for questions and updates.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">Fair Pricing</h3>
              <p className="opacity-90">Professional quality without enterprise-level prices.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary font-display">Ready to Get Online?</h2>
          <p className="text-xl text-muted-foreground mb-8">Let's discuss your website needs and build something great together.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              to="/request-service?service=WEBSITE" 
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

export default WebsiteHosting;
