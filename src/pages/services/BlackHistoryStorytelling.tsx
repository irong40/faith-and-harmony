import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BlackHistoryStorytelling = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <div className="text-6xl mb-6">📚</div>
          <h1 className="text-5xl font-bold mb-6 text-primary font-display">
            Black History Storytelling Packages
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            Our stories matter. We help you document, preserve, and share the narratives that shaped our communities—from family histories to local legends.
          </p>
          <div className="inline-block bg-accent/20 border border-accent rounded-full px-6 py-3">
            <span className="text-accent font-bold text-lg">Starting at $300 per project</span>
          </div>
        </section>

        {/* Services */}
        <section className="mb-16 bg-card rounded-3xl p-10 shadow-xl border border-border">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Stories That Shape the Future</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Family History Documentation</h3>
                <p className="text-card-foreground">Capture your family's journey through interviews, archival research, and professional video production.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Community History Projects</h3>
                <p className="text-card-foreground">Document the stories of churches, neighborhoods, and organizations that shaped our communities.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Educational Content</h3>
                <p className="text-card-foreground">Create age-appropriate content for schools, churches, and community programs.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Research & Writing</h3>
                <p className="text-card-foreground">Professional research and scriptwriting services for your storytelling projects.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who We Partner With */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Who We Partner With</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Families", description: "Preserving generational stories and creating heirlooms for future generations." },
              { title: "Churches", description: "Documenting congregation histories and faith journeys." },
              { title: "Schools", description: "Creating educational content that inspires students." },
              { title: "Museums & Libraries", description: "Contributing to local and regional history collections." },
              { title: "Community Organizations", description: "Capturing the impact of civic and social groups." },
              { title: "Individuals", description: "Personal memoir and legacy projects." }
            ].map((item, index) => (
              <div key={index} className="bg-card rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-bold text-primary mb-3">{item.title}</h3>
                <p className="text-card-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why It Matters */}
        <section className="mb-16 bg-primary rounded-3xl p-10 shadow-2xl">
          <h2 className="text-4xl font-bold mb-8 text-center font-display text-primary-foreground">Why Black History Storytelling Matters</h2>
          <div className="grid md:grid-cols-2 gap-8 text-secondary">
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Reclaiming Our Narrative</h3>
              <p className="mb-6 opacity-90">For too long, others have told our stories. It's time we tell them ourselves, in our own voices.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">Connecting Generations</h3>
              <p className="opacity-90">Our youth need to know where they came from to understand where they can go.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Preservation</h3>
              <p className="mb-6 opacity-90">Every day, we lose elders whose stories haven't been captured. The time to act is now.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">Inspiration</h3>
              <p className="opacity-90">Our ancestors overcame incredible obstacles. Their stories inspire us to do the same.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary font-display">Ready to Tell Your Story?</h2>
          <p className="text-xl text-muted-foreground mb-8">Let's preserve the stories that matter most to you and your community.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              to="/request-service?service=BLACK_HISTORY" 
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

export default BlackHistoryStorytelling;
