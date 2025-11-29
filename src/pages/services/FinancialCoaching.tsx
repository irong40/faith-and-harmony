import { Link } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";

const FinancialCoaching = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="max-w-6xl mx-auto px-8">
        {/* Navigation */}
        <nav className="py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoIcon} alt="Faith & Harmony" className="w-10 h-10" />
            <span className="font-display font-bold text-xl text-primary">Faith & Harmony</span>
          </Link>
          <Link to="/services" className="text-primary hover:text-accent font-semibold transition-colors">
            ← Back to Services
          </Link>
        </nav>

        {/* Hero Section */}
        <section className="py-16 text-center">
          <div className="text-6xl mb-6">🌱</div>
          <h1 className="text-5xl font-bold mb-6 text-primary font-display">
            Financial Freedom & Land Ownership Coaching
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            Build generational wealth through strategic financial planning and land acquisition. Our people built this country—it's time we own a piece of it.
          </p>
          <div className="inline-block bg-accent/20 border border-accent rounded-full px-6 py-3">
            <span className="text-accent font-bold text-lg">Starting at $150 per session</span>
          </div>
        </section>

        {/* What We Offer */}
        <section className="mb-16 bg-card rounded-3xl p-10 shadow-xl border border-border">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">What We Offer</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Financial Assessment</h3>
                <p className="text-card-foreground">Comprehensive review of your current financial situation and goals.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Debt Reduction Strategy</h3>
                <p className="text-card-foreground">Practical plans to eliminate debt and build financial stability.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Land Acquisition Guidance</h3>
                <p className="text-card-foreground">Navigate the process of purchasing land for personal or investment purposes.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Generational Wealth Planning</h3>
                <p className="text-card-foreground">Strategies to build and transfer wealth to future generations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Land Ownership */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Why Land Ownership Matters</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Stability", description: "Land provides a foundation that can't be taken away. It's security for you and your family." },
              { title: "Legacy", description: "Pass something tangible to your children and grandchildren." },
              { title: "Appreciation", description: "Land typically increases in value over time, building wealth passively." },
              { title: "Options", description: "Build a home, start a farm, create a business, or simply hold as an investment." },
              { title: "Freedom", description: "Ownership brings independence and self-determination." },
              { title: "Community", description: "Collective land ownership can strengthen our communities." }
            ].map((item, index) => (
              <div key={index} className="bg-card rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-bold text-primary mb-3">{item.title}</h3>
                <p className="text-card-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Our Approach */}
        <section className="mb-16 bg-primary rounded-3xl p-10 shadow-2xl">
          <h2 className="text-4xl font-bold mb-8 text-center font-display text-primary-foreground">Our Approach</h2>
          <div className="grid md:grid-cols-2 gap-8 text-secondary">
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">No Judgment</h3>
              <p className="mb-6 opacity-90">Whatever your starting point, we meet you there and work forward together.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">Practical Steps</h3>
              <p className="opacity-90">Real, actionable advice—not theoretical concepts that don't apply to your life.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Cultural Context</h3>
              <p className="mb-6 opacity-90">Financial advice that understands the unique challenges and opportunities in our communities.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">Long-term Partnership</h3>
              <p className="opacity-90">We're here for the journey, not just a single session.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary font-display">Ready to Build Your Legacy?</h2>
          <p className="text-xl text-muted-foreground mb-8">Let's start your journey to financial freedom and land ownership.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              to="/request-service?service=FINANCIAL" 
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

export default FinancialCoaching;
