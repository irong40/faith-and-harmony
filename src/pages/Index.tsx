
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto px-8">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="mb-8">
            <h1 className="text-7xl font-bold mb-6 text-indigo-900 font-serif tracking-tight leading-tight">
              Faith & Harmony LLC
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 mx-auto mb-8 rounded-full"></div>
            <h2 className="text-5xl font-bold mb-6 text-indigo-800 font-serif">
              Rooted in Purpose, Driven by Service
            </h2>
            <p className="text-2xl text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed">
              From gospel music to government contracting, we fuse culture, technology, and automation to help our people win.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/services" className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-lg rounded-full hover:from-indigo-700 hover:to-indigo-800 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                Explore Our Services
              </Link>
              <button className="px-10 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-semibold text-lg rounded-full hover:from-amber-600 hover:to-yellow-500 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                Book a Free Consultation
              </button>
              <a href="https://faithandharmonyllc.com/" target="_blank" rel="noopener noreferrer" className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold text-lg rounded-full hover:from-emerald-700 hover:to-emerald-800 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                Shop at Our Store
              </a>
            </div>
          </div>
        </section>

        {/* About Faith & Harmony Section */}
        <section className="mb-20 bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-300">
          <h2 className="text-5xl font-bold mb-8 text-indigo-900 text-center font-serif">About Faith & Harmony</h2>
          <p className="text-xl text-gray-700 leading-8 max-w-5xl mx-auto text-center">
            Faith & Harmony LLC is a purpose-driven company built by Dr. Adam Pierce to support Black excellence through automation, creative media, and spiritual grounding. Whether you're building a brand, preserving a legacy, or protecting digital systems—we help you move with power and peace.
          </p>
        </section>

        {/* Our Services Section */}
        <section className="mb-20">
          <h2 className="text-5xl font-bold mb-12 text-indigo-900 text-center font-serif">Our Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "🎥", title: "AI Video Creation & Content Automation", description: "Streamline your content creation with cutting-edge AI tools", link: "/services/ai-video-creation" },
              { icon: "🏛️", title: "Masonic & OES Digital Projects", description: "Preserve and modernize fraternal organization traditions", link: "/services/masonic-digital-projects" },
              { icon: "📚", title: "Black History Storytelling Packages", description: "Craft compelling narratives that honor our heritage", link: "/services/black-history-storytelling" },
              { icon: "🛡️", title: "Cybersecurity AI Tools (Sentinel AI)", description: "Protect your digital assets with intelligent security solutions", link: "/services/cybersecurity-ai" },
              { icon: "🧾", title: "Vendor Assistant Systems for Events", description: "Automate your event management and vendor operations", link: "/services/vendor-assistant" },
              { icon: "🎷", title: "Church Tech & Gospel Saxophone Programs", description: "Enhance worship through technology and musical excellence", link: "/services/church-tech" },
              { icon: "🌱", title: "Financial Freedom & Land Ownership Coaching", description: "Build generational wealth through strategic planning", link: "/services/financial-coaching" }
            ].map((service, index) => (
              <Link key={index} to={service.link} className="group">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group border border-indigo-100">
                  <div className="text-center mb-6">
                    <span className="text-5xl mb-4 block group-hover:scale-110 transition-transform duration-300">
                      {service.icon}
                    </span>
                    <h3 className="text-xl font-bold text-indigo-900 mb-3 font-serif">
                      {service.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
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
          <h2 className="text-5xl font-bold mb-12 text-indigo-900 text-center font-serif">Featured Projects</h2>
          <div className="space-y-8">
            {[
              { 
                title: "\"They Never Told Us...\" YouTube Series", 
                description: "Educational content series uncovering untold stories and hidden history for community empowerment."
              },
              { 
                title: "Sentinel AI Cybersecurity Platform", 
                description: "AI-powered security assessment tools protecting organizations from digital threats."
              },
              { 
                title: "Virtual Lodge Lecture Series", 
                description: "Digital preservation and modernization of fraternal organization teachings and ceremonies."
              },
              { 
                title: "Church Audio Rewire & Hybrid Musician Setup", 
                description: "Complete audio visual consulting for worship spaces and musician integration systems."
              }
            ].map((project, index) => (
              <div key={index} className="bg-gradient-to-r from-white/90 to-indigo-50/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-amber-500">
                <h3 className="text-2xl font-bold text-indigo-900 mb-3 font-serif">{project.title}</h3>
                <p className="text-lg text-gray-700 leading-relaxed">{project.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="mb-20 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-12 shadow-2xl text-center text-white">
          <h2 className="text-4xl font-bold mb-6 font-serif">Let's Build Your Legacy</h2>
          <p className="text-xl mb-8 opacity-90">Ready to transform your vision into reality?</p>
          <button className="px-12 py-5 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-bold text-xl rounded-full hover:from-amber-600 hover:to-yellow-500 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
            Book a Discovery Call
          </button>
        </section>

        {/* Contact Section */}
        <section className="mb-20 bg-white/90 backdrop-blur-sm rounded-3xl p-10 shadow-xl text-center">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 font-serif">Contact Us</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl">📞</span>
                <a href="tel:760-575-4876" className="text-xl text-indigo-700 hover:text-indigo-900 font-semibold">
                  760-575-4876
                </a>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl">📧</span>
                <a href="mailto:dradamopierce@gmail.com" className="text-xl text-indigo-700 hover:text-indigo-900 font-semibold">
                  dradamopierce@gmail.com
                </a>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl">🌐</span>
                <span className="text-xl text-gray-700">faithandharmonyllc.com</span>
              </div>
              <div className="flex justify-center space-x-6">
                <span className="text-2xl cursor-pointer hover:scale-110 transition-transform">📺</span>
                <span className="text-2xl cursor-pointer hover:scale-110 transition-transform">📱</span>
                <span className="text-2xl cursor-pointer hover:scale-110 transition-transform">🎵</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-indigo-200">
          <p className="text-gray-600 text-lg">
            &copy; 2025 Faith & Harmony LLC. All rights reserved.
          </p>
          <p className="text-indigo-700 text-sm mt-2 font-semibold">
            Dr. Adam Pierce - Rooted in Purpose, Driven by Service
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
