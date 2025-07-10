import { Link } from "react-router-dom";

const Services = () => {
  const services = [
    {
      icon: "🎥",
      title: "AI Video Creation & Content Automation",
      description: "Streamline your content creation with cutting-edge AI tools that help amplify Black voices and stories.",
      link: "/services/ai-video-creation",
      highlights: ["AI-powered video production", "Automated content workflows", "Brand storytelling"]
    },
    {
      icon: "🏛️",
      title: "Masonic & OES Digital Projects",
      description: "Preserve and modernize fraternal organization traditions through secure digital platforms.",
      link: "/services/masonic-digital-projects",
      highlights: ["Digital ritual preservation", "Virtual meeting platforms", "Secure communications"]
    },
    {
      icon: "📚",
      title: "Black History Storytelling Packages",
      description: "Craft compelling narratives that honor our heritage and educate future generations.",
      link: "/services/black-history-storytelling",
      highlights: ["Custom historical narratives", "Educational content packages", "Community documentaries"]
    },
    {
      icon: "🛡️",
      title: "Cybersecurity AI Tools (Sentinel AI)",
      description: "Protect your digital assets with intelligent security solutions designed for community organizations.",
      link: "/services/cybersecurity-ai",
      highlights: ["AI-powered threat detection", "24/7 security monitoring", "Community-focused protection"]
    },
    {
      icon: "🧾",
      title: "Vendor Assistant Systems for Events",
      description: "Automate your event management and vendor operations for maximum efficiency and profit.",
      link: "/services/vendor-assistant",
      highlights: ["Smart inventory management", "Automated payments", "Real-time analytics"]
    },
    {
      icon: "🎷",
      title: "Church Tech & Gospel Saxophone Programs",
      description: "Enhance worship through technology and musical excellence, bridging tradition with innovation.",
      link: "/services/church-tech",
      highlights: ["Audio/visual consulting", "Gospel music education", "Live streaming setup"]
    },
    {
      icon: "🌱",
      title: "Financial Freedom & Land Ownership Coaching",
      description: "Build generational wealth through strategic planning, property investment, and financial education.",
      link: "/services/financial-coaching",
      highlights: ["Personal financial planning", "Real estate guidance", "Generational wealth building"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto px-8">
        {/* Navigation */}
        <nav className="py-6">
          <Link to="/" className="text-indigo-700 hover:text-indigo-900 font-semibold">
            ← Back to Home
          </Link>
        </nav>

        {/* Hero Section */}
        <section className="py-16 text-center">
          <h1 className="text-6xl font-bold mb-6 text-indigo-900 font-serif tracking-tight leading-tight">
            Our Services
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 mx-auto mb-8 rounded-full"></div>
          <p className="text-2xl text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed">
            Comprehensive solutions designed to empower individuals, strengthen communities, and build lasting legacies through technology, education, and strategic planning.
          </p>
        </section>

        {/* Services Grid */}
        <section className="mb-20">
          <div className="grid lg:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Link key={index} to={service.link} className="group">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group border border-indigo-100 h-full">
                  <div className="mb-6">
                    <span className="text-5xl mb-4 block group-hover:scale-110 transition-transform duration-300">
                      {service.icon}
                    </span>
                    <h3 className="text-2xl font-bold text-indigo-900 mb-3 font-serif">
                      {service.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {service.description}
                    </p>
                  </div>
                  
                  {/* Key Highlights */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-semibold text-indigo-800 mb-2">Key Features:</p>
                    <ul className="space-y-1">
                      {service.highlights.map((highlight, highlightIndex) => (
                        <li key={highlightIndex} className="text-sm text-gray-600">
                          • {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Learn More Button */}
                  <div className="mt-6">
                    <span className="inline-flex items-center text-indigo-700 font-semibold group-hover:text-indigo-900 transition-colors duration-300">
                      Learn More 
                      <span className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Why Choose Faith & Harmony */}
        <section className="mb-20 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-12 shadow-2xl text-white">
          <h2 className="text-4xl font-bold mb-8 text-center font-serif">Why Choose Faith & Harmony</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-4">Purpose-Driven</h3>
              <p>Every service is designed with your community's empowerment and success at the heart of what we do.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔧</div>
              <h3 className="text-xl font-bold mb-4">Expert Execution</h3>
              <p>Dr. Pierce's diverse expertise in technology, music, and ministry ensures professional, reliable solutions.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold mb-4">Community Focused</h3>
              <p>We understand the unique challenges and opportunities within Black and faith-based communities.</p>
            </div>
          </div>
        </section>

        {/* Process Overview */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold mb-12 text-indigo-900 text-center font-serif">How We Work Together</h2>
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
              <div key={index} className="bg-white/90 rounded-2xl p-6 shadow-lg text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full flex items-center justify-center text-indigo-900 font-bold text-xl mb-4 mx-auto">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-indigo-900 mb-3">{item.title}</h3>
                <p className="text-gray-700">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-indigo-900 font-serif">Ready to Get Started?</h2>
          <p className="text-xl text-gray-700 mb-8">
            Whether you need one service or want to discuss a comprehensive approach to your goals, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="px-10 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-semibold text-lg rounded-full hover:from-amber-600 hover:to-yellow-500 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Schedule Free Consultation
            </button>
            <Link to="/" className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-lg rounded-full hover:from-indigo-700 hover:to-indigo-800 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Back to Home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Services;