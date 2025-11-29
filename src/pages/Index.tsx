import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import logoIcon from "@/assets/logo-icon.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="mb-8">
            <img src={logoIcon} alt="Faith & Harmony" className="w-24 h-24 mx-auto mb-6" />
            <h1 className="text-7xl font-bold mb-6 text-primary font-display tracking-tight leading-tight">
              Faith & Harmony LLC
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-accent to-amber-400 mx-auto mb-8 rounded-full"></div>
            <h2 className="text-5xl font-bold mb-6 text-primary font-display">
              Rooted in Purpose, Driven by Service
            </h2>
            <p className="text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed">
              From gospel music to government contracting, we fuse culture, technology, and automation to help our people win.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/services" className="px-10 py-4 bg-primary text-primary-foreground font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                Explore Our Services
              </Link>
              <Link to="/request-service" className="px-10 py-4 bg-gradient-to-r from-accent to-amber-400 text-primary font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                Request a Service
              </Link>
              <Link to="/shop" className="px-10 py-4 bg-brand-purple-light text-secondary font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                Shop at Our Store
              </Link>
            </div>
          </div>
        </section>

        {/* About Faith & Harmony Section */}
        <section className="mb-20 bg-card backdrop-blur-sm rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-300">
          <h2 className="text-5xl font-bold mb-8 text-primary text-center font-display">About Faith & Harmony</h2>
          <p className="text-xl text-card-foreground leading-8 max-w-5xl mx-auto text-center">
            Faith & Harmony LLC is a purpose-driven company built by Dr. Adam Pierce to support Black excellence through automation, creative media, and spiritual grounding. Whether you're building a brand, preserving a legacy, or protecting digital systems—we help you move with power and peace.
          </p>
        </section>

        {/* Our Services Section */}
        <section className="mb-20">
          <h2 className="text-5xl font-bold mb-12 text-primary text-center font-display">Our Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "🎥", title: "AI Video Creation & Content Automation", description: "Streamline your content creation with cutting-edge AI tools", link: "/services/ai-video-creation" },
              { icon: "🏛️", title: "Masonic & OES Digital Projects", description: "Preserve and modernize fraternal organization traditions", link: "/services/masonic-digital-projects" },
              { icon: "📚", title: "Black History Storytelling Packages", description: "Craft compelling narratives that honor our heritage", link: "/services/black-history-storytelling" },
              { icon: "🛡️", title: "Cybersecurity Services", description: "Protect your digital assets with intelligent security solutions", link: "/services/cybersecurity-ai" },
              { icon: "🧾", title: "Vendor Assistant Systems for Events", description: "Automate your event management and vendor operations", link: "/services/vendor-assistant" },
              { icon: "🎷", title: "Church Tech & Gospel Saxophone Programs", description: "Enhance worship through technology and musical excellence", link: "/services/church-tech" },
              { icon: "🚁", title: "Aerial Photography & Inspections", description: "FAA Part 107 certified drone services for land and sea", link: "/services/aerial-photography" },
              { icon: "🌐", title: "Website Hosting & Development", description: "Professional web design, development, and hosting services", link: "/services/website-hosting" }
            ].map((service, index) => (
              <Link key={index} to={service.link} className="group">
                <div className="bg-card backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group border border-border">
                  <div className="text-center mb-6">
                    <span className="text-5xl mb-4 block group-hover:scale-110 transition-transform duration-300">
                      {service.icon}
                    </span>
                    <h3 className="text-xl font-bold text-primary mb-3 font-display">
                      {service.title}
                    </h3>
                    <p className="text-card-foreground leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Projects Section */}
        <section className="mb-20">
          <h2 className="text-5xl font-bold mb-12 text-primary text-center font-display">Featured Projects</h2>
          <div className="space-y-8">
            {[
              { 
                title: "\"They Never Told Us...\" YouTube Series", 
                description: "Educational content series uncovering untold stories and hidden history for community empowerment."
              },
              { 
                title: "Cybersecurity Platform", 
                description: "AI-powered security assessment tools protecting organizations from digital threats."
              },
              { 
                title: "Lodge Lecture Series", 
                description: "Digital preservation and modernization of fraternal organization teachings and ceremonies."
              },
              { 
                title: "Church Audio Rewire & Hybrid Musician Setup", 
                description: "Complete audio visual consulting for worship spaces and musician integration systems."
              }
            ].map((project, index) => (
              <div key={index} className="bg-gradient-to-r from-card to-secondary backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-accent">
                <h3 className="text-2xl font-bold text-primary mb-3 font-display">{project.title}</h3>
                <p className="text-lg text-card-foreground leading-relaxed">{project.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="mb-20 bg-primary rounded-3xl p-12 shadow-2xl text-center">
          <h2 className="text-4xl font-bold mb-6 font-display text-primary-foreground">Let's Build Your Legacy</h2>
          <p className="text-xl mb-8 text-secondary opacity-90">Ready to transform your vision into reality?</p>
          <Link to="/request-service" className="inline-block px-12 py-5 bg-gradient-to-r from-accent to-amber-400 text-primary font-bold text-xl rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
            Request a Service
          </Link>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Index;