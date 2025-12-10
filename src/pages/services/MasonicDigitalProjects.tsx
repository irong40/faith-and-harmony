import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import masonicImage from "@/assets/services/masonic.png";

const MasonicDigitalProjects = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <img src={masonicImage} alt="Masonic Digital Projects" className="w-24 h-24 rounded-2xl object-cover mx-auto mb-6 shadow-lg" />
          <h1 className="text-5xl font-bold mb-6 text-primary font-display">
            Masonic & OES Digital Projects
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            Preserve your lodge's legacy and modernize your fraternal traditions with digital solutions built by someone who understands the work.
          </p>
          <div className="inline-block bg-accent/20 border border-accent rounded-full px-6 py-3">
            <span className="text-accent font-bold text-lg">Starting at $250 per project</span>
          </div>
        </section>

        {/* What We Offer */}
        <section className="mb-16 bg-card rounded-3xl p-10 shadow-xl border border-border">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">What We Offer</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Digital Preservation</h3>
                <p className="text-card-foreground">Archive and digitize historical documents, photographs, and records for future generations.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Lecture Series Production</h3>
                <p className="text-card-foreground">Professional video lectures for education and instruction within your organization.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Who We Serve</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "Prince Hall Blue Lodges",
              "OES Chapters",
              "Prince Hall Concordant Bodies",
              "Other Fraternal Organizations"
            ].map((org, index) => (
              <div key={index} className="bg-card rounded-2xl p-6 shadow-lg border border-border text-center hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-bold text-primary">{org}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* Why This Matters */}
        <section className="mb-16 bg-primary rounded-3xl p-10 shadow-2xl">
          <h2 className="text-4xl font-bold mb-8 text-center font-display text-primary-foreground">Why This Matters</h2>
          <div className="grid md:grid-cols-3 gap-8 text-secondary">
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Legacy Preservation</h3>
              <p className="opacity-90">Our history and traditions deserve to be preserved for those who come after us.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Global Connection</h3>
              <p className="opacity-90">Connect members across distances while maintaining the integrity of our practices.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Security First</h3>
              <p className="opacity-90">Your lodge's information is handled with the discretion and security it deserves.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary font-display">Ready to Modernize Your Lodge?</h2>
          <p className="text-xl text-muted-foreground mb-8">Let's discuss how we can help preserve your legacy while embracing the future.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              to="/request-service?service=MASONIC" 
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

export default MasonicDigitalProjects;
