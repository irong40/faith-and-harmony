import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CybersecurityAI = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <div className="text-6xl mb-6">🛡️</div>
          <h1 className="text-5xl font-bold mb-6 text-primary font-display">
            Cybersecurity Services
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            Protect your organization with AI-powered security assessments and tools. Built by a cybersecurity professional for real-world protection.
          </p>
          <div className="inline-block bg-accent/20 border border-accent rounded-full px-6 py-3">
            <span className="text-accent font-bold text-lg">Starting at $500 per project</span>
          </div>
        </section>

        {/* What We Offer */}
        <section className="mb-16 bg-card rounded-3xl p-10 shadow-xl border border-border">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">What We Offer</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Security Assessments</h3>
                <p className="text-card-foreground">Comprehensive evaluation of your organization's security posture using AI-enhanced analysis.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Policy Documentation</h3>
                <p className="text-card-foreground">Generate and maintain security policies tailored to your organization's needs and compliance requirements.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Risk Analysis</h3>
                <p className="text-card-foreground">Identify vulnerabilities and prioritize remediation based on actual risk to your operations.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Incident Response Planning</h3>
                <p className="text-card-foreground">Prepare your team for security incidents with documented procedures and training.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who Needs This */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Who Needs This?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Small Businesses", description: "Protect customer data and business operations without enterprise-level budgets." },
              { title: "Nonprofits", description: "Secure donor information and maintain trust with proper security practices." },
              { title: "Churches & Ministries", description: "Protect member data and online giving platforms." },
              { title: "Software Companies", description: "Ensure your products meet security standards and protect user data." },
              { title: "Healthcare Providers", description: "Meet HIPAA requirements and protect patient information." },
              { title: "Government Contractors", description: "Achieve compliance with federal security requirements." }
            ].map((item, index) => (
              <div key={index} className="bg-card rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-bold text-primary mb-3">{item.title}</h3>
                <p className="text-card-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Cybersecurity Matters */}
        <section className="mb-16 bg-primary rounded-3xl p-10 shadow-2xl">
          <h2 className="text-4xl font-bold mb-8 text-center font-display text-primary-foreground">Why Cybersecurity Matters</h2>
          <div className="grid md:grid-cols-2 gap-8 text-secondary">
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Protect Your Community</h3>
              <p className="mb-6 opacity-90">A breach doesn't just hurt you—it affects everyone whose data you hold.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">Maintain Trust</h3>
              <p className="opacity-90">Your members, customers, and partners trust you with sensitive information.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Compliance Requirements</h3>
              <p className="mb-6 opacity-90">Many industries now require documented security practices and regular assessments.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">Business Continuity</h3>
              <p className="opacity-90">A security incident can shut down operations. Prevention is always cheaper than recovery.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary font-display">Ready to Secure Your Organization?</h2>
          <p className="text-xl text-muted-foreground mb-8">Let's assess your security posture and build a protection plan that works for you.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              to="/request-service?service=CYBERSECURITY" 
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

export default CybersecurityAI;
