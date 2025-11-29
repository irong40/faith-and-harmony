import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AIVideoCreation = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <div className="text-6xl mb-6">🎥</div>
          <h1 className="text-5xl font-bold mb-6 text-primary font-display">
            AI Video Creation & Content Automation
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            Amplify your voice and streamline your content creation with cutting-edge AI tools designed to help you tell powerful stories efficiently and professionally.
          </p>
          <div className="inline-block bg-accent/20 border border-accent rounded-full px-6 py-3">
            <span className="text-accent font-bold text-lg">Starting at $350 per video</span>
          </div>
        </section>

        {/* What We Offer */}
        <section className="mb-16 bg-card rounded-3xl p-10 shadow-xl border border-border">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">What We Offer</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">AI-Powered Video Production</h3>
                <p className="text-card-foreground">Transform your ideas into professional videos using advanced AI tools for scripting, voiceovers, and visual creation.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Automated Content Workflows</h3>
                <p className="text-card-foreground">Set up systems that automatically generate social media content, newsletters, and marketing materials from your core content.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Educational Content Creation</h3>
                <p className="text-card-foreground">Develop engaging educational videos and training materials for schools, churches, and community organizations.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Brand Storytelling</h3>
                <p className="text-card-foreground">Craft compelling narratives that showcase your mission, values, and impact in the community.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who This Helps */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Who This Helps</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Content Creators", description: "Individuals looking to scale their content production without sacrificing quality or authenticity." },
              { title: "Churches & Ministries", description: "Religious organizations wanting to reach wider audiences with sermons, testimonies, and community stories." },
              { title: "Small Businesses", description: "Entrepreneurs needing professional marketing content on a budget." },
              { title: "Educators", description: "Teachers and trainers creating engaging educational materials." },
              { title: "Community Leaders", description: "Activists and organizers sharing important messages and mobilizing their communities." },
              { title: "Nonprofits", description: "Organizations telling impact stories to attract donors and volunteers." }
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
          <h2 className="text-4xl font-bold mb-8 text-center font-display text-primary-foreground">Why Choose Faith & Harmony</h2>
          <div className="grid md:grid-cols-2 gap-8 text-secondary">
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Cultural Understanding</h3>
              <p className="mb-6 opacity-90">We understand the unique needs of Black and faith-based communities, ensuring your content resonates authentically.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">Technical Excellence</h3>
              <p className="opacity-90">Dr. Pierce's background in cybersecurity and automation ensures you get cutting-edge solutions that actually work.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Purpose-Driven Approach</h3>
              <p className="mb-6 opacity-90">Every project is designed to amplify positive impact and serve your community's needs.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">End-to-End Support</h3>
              <p className="opacity-90">From strategy and creation to distribution and automation, we handle the entire content lifecycle.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary font-display">Ready to Amplify Your Voice?</h2>
          <p className="text-xl text-muted-foreground mb-8">Let's discuss how AI-powered content creation can transform your message and reach.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              to="/request-service?service=AI_VIDEO" 
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

export default AIVideoCreation;
