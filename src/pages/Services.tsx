import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SERVICES } from "@/data/services";

// Service images
import aiVideoImg from "@/assets/services/ai-video.png";
import masonicImg from "@/assets/services/masonic.png";
import blackHistoryImg from "@/assets/services/black-history.png";
import cybersecurityImg from "@/assets/services/cybersecurity.png";
import vendorAssistantImg from "@/assets/services/vendor-assistant.png";
import churchTechImg from "@/assets/services/church-tech.png";
import aerialImg from "@/assets/services/aerial.png";
import websiteImg from "@/assets/services/website.png";

const serviceDetails: Record<string, { image: string; description: string; highlights: string[] }> = {
  AI_VIDEO: {
    image: aiVideoImg,
    description: "Streamline your content creation with cutting-edge AI tools that help amplify Black voices and stories.",
    highlights: ["AI-powered video production", "Automated content workflows", "Brand storytelling"]
  },
  MASONIC: {
    image: masonicImg,
    description: "Preserve and modernize fraternal organization traditions through secure digital platforms.",
    highlights: ["Digital ritual preservation", "Lecture series production", "Secure communications"]
  },
  BLACK_HISTORY: {
    image: blackHistoryImg,
    description: "Craft compelling narratives that honor our heritage and educate future generations.",
    highlights: ["Custom historical narratives", "Educational content packages", "Community documentaries"]
  },
  CYBERSECURITY: {
    image: cybersecurityImg,
    description: "Protect your digital assets with intelligent security solutions designed for community organizations.",
    highlights: ["AI-powered threat detection", "24/7 security monitoring", "Community-focused protection"]
  },
  VENDOR_ASSISTANT: {
    image: vendorAssistantImg,
    description: "Automate your event management and vendor operations for maximum efficiency and profit.",
    highlights: ["Smart inventory management", "Automated payments", "Real-time analytics"]
  },
  CHURCH_TECH: {
    image: churchTechImg,
    description: "Enhance worship through technology and musical excellence, bridging tradition with innovation.",
    highlights: ["Audio/visual consulting", "Gospel music education", "Live streaming setup"]
  },
  AERIAL: {
    image: aerialImg,
    description: "FAA Part 107 certified drone services for stunning aerial photography and detailed property inspections.",
    highlights: ["Land and sea coverage", "Property inspections", "4K video and photography"]
  },
  WEBSITE: {
    image: websiteImg,
    description: "Professional web design, development, and reliable hosting services for businesses and organizations.",
    highlights: ["Custom web design", "Reliable hosting", "Ongoing support"]
  }
};

const formatPrice = (price: number, unit: string) => {
  if (unit === "starting at") {
    return `Starting at $${price}`;
  }
  return `From $${price} ${unit}`;
};

const Services = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <h1 className="text-6xl font-bold mb-6 text-primary font-display tracking-tight leading-tight">
            Our Services
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-accent to-amber-400 mx-auto mb-8 rounded-full"></div>
          <p className="text-2xl text-foreground mb-12 max-w-4xl mx-auto leading-relaxed">
            Comprehensive solutions designed to empower individuals, strengthen communities, and build lasting legacies through technology, education, and strategic planning.
          </p>
        </section>

        {/* Services Grid */}
        <section className="mb-20">
          <div className="grid lg:grid-cols-2 gap-8">
            {SERVICES.map((service) => {
              const details = serviceDetails[service.code];
              return (
                <Link key={service.code} to={service.route} className="group">
                  <div className="bg-card backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group border border-border h-full flex flex-col">
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-4">
                        <img 
                          src={details.image} 
                          alt={service.name} 
                          className="w-16 h-16 rounded-xl object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {service.category}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-primary mb-3 font-display">
                        {service.name}
                      </h3>
                      <p className="text-card-foreground leading-relaxed">
                        {details.description}
                      </p>
                    </div>
                    
                    {/* Pricing */}
                    <div className="bg-accent/10 rounded-xl p-4 mb-4">
                      <p className="text-lg font-bold text-accent">
                        {formatPrice(service.startingPrice, service.pricingUnit)}
                      </p>
                      <p className="text-xs text-muted-foreground">Final pricing based on project scope</p>
                    </div>
                    
                    {/* Key Highlights */}
                    <div className="border-t border-border pt-4 flex-grow">
                      <p className="text-sm font-semibold text-accent mb-2">Key Features:</p>
                      <ul className="space-y-1">
                        {details.highlights.map((highlight, highlightIndex) => (
                          <li key={highlightIndex} className="text-sm text-muted-foreground">
                            • {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Learn More Button */}
                    <div className="mt-6 pt-4 border-t border-border">
                      <span className="inline-flex items-center text-accent font-semibold group-hover:text-primary transition-colors duration-300">
                        Learn More 
                        <span className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Why Choose Faith & Harmony */}
        <section className="mb-20 bg-primary rounded-3xl p-12 shadow-2xl">
          <h2 className="text-4xl font-bold mb-8 text-center font-display text-primary-foreground">Why Choose Faith & Harmony</h2>
          <div className="grid md:grid-cols-3 gap-8 text-secondary">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-4 text-primary-foreground">Purpose-Driven</h3>
              <p>Every service is designed with your community's empowerment and success at the heart of what we do.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔧</div>
              <h3 className="text-xl font-bold mb-4 text-primary-foreground">Expert Execution</h3>
              <p>Dr. Pierce's diverse expertise in technology, music, and ministry ensures professional, reliable solutions.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold mb-4 text-primary-foreground">Community Focused</h3>
              <p>We understand the unique challenges and opportunities within Black and faith-based communities.</p>
            </div>
          </div>
        </section>

        {/* Process Overview */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold mb-12 text-primary text-center font-display">How We Work Together</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { 
                step: "1", 
                title: "Discovery Call", 
                description: "We listen to your needs, challenges, and vision for your project or organization." 
              },
              { 
                step: "2", 
                title: "Custom Strategy", 
                description: "We develop a tailored approach that aligns with your goals, budget, and timeline." 
              },
              { 
                step: "3", 
                title: "Implementation", 
                description: "We execute the plan with regular updates and collaboration throughout the process." 
              },
              { 
                step: "4", 
                title: "Ongoing Support", 
                description: "We provide training, maintenance, and continued guidance to ensure your success." 
              }
            ].map((item, index) => (
              <div key={index} className="bg-card rounded-2xl p-6 shadow-lg text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-accent to-amber-400 rounded-full flex items-center justify-center text-primary font-bold text-xl mb-4 mx-auto">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-primary mb-3">{item.title}</h3>
                <p className="text-card-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary font-display">Ready to Get Started?</h2>
          <p className="text-xl text-foreground mb-8">
            Whether you need one service or want to discuss a comprehensive approach to your goals, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/request-service" className="px-10 py-4 bg-gradient-to-r from-accent to-amber-400 text-primary font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Schedule Free Consultation
            </Link>
            <Link to="/" className="px-10 py-4 bg-primary text-primary-foreground font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Back to Home
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Services;