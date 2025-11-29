import { Link } from "react-router-dom";
import { Camera, CheckCircle, Plane, Shield, MapPin, Building } from "lucide-react";

const AerialPhotography = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto px-8">
        {/* Header */}
        <header className="py-6 flex justify-between items-center border-b border-indigo-200">
          <Link to="/" className="text-2xl font-bold text-indigo-900 font-serif">Faith & Harmony</Link>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-gray-700 hover:text-indigo-700 transition-colors">Home</Link>
            <Link to="/services" className="text-indigo-700 font-semibold">Services</Link>
            <Link to="/shop" className="text-gray-700 hover:text-indigo-700 transition-colors">Shop</Link>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="py-16 text-center">
          <div className="inline-block p-4 bg-indigo-100 rounded-2xl mb-6">
            <Plane className="w-12 h-12 text-indigo-700" />
          </div>
          <h1 className="text-5xl font-bold mb-4 text-indigo-900 font-serif">Aerial Photography & Inspections</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 mx-auto mb-6 rounded-full"></div>
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full font-semibold mb-6">
            <Shield className="w-5 h-5" />
            FAA Part 107 Certified
          </div>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Professional drone services for land, sea, and beyond. From stunning aerial photography to detailed property inspections, 
            we deliver high-quality imagery and data you can trust.
          </p>
        </section>

        {/* Services Grid */}
        <section className="pb-16">
          <h2 className="text-3xl font-bold mb-8 text-indigo-900 font-serif text-center">Our Aerial Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Camera, title: "Aerial Photography", description: "Stunning high-resolution photos for real estate, events, marketing, and personal projects" },
              { icon: Building, title: "Property Inspections", description: "Detailed roof, structural, and property inspections without the need for ladders or scaffolding" },
              { icon: MapPin, title: "Land Surveys", description: "Comprehensive aerial mapping and surveying for construction, agriculture, and land management" },
              { icon: Plane, title: "Marine/Coastal", description: "Offshore and coastal photography, dock inspections, and waterfront property surveys" },
              { icon: Shield, title: "Insurance Documentation", description: "Pre and post-storm inspections, damage assessments, and claim documentation" },
              { icon: CheckCircle, title: "Progress Monitoring", description: "Construction progress tracking, site documentation, and time-lapse projects" }
            ].map((service, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                <service.icon className="w-10 h-10 text-indigo-600 mb-4" />
                <h3 className="text-xl font-bold text-indigo-900 mb-2">{service.title}</h3>
                <p className="text-gray-700">{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="pb-16">
          <div className="bg-white rounded-3xl p-10 shadow-xl">
            <h2 className="text-3xl font-bold mb-8 text-indigo-900 font-serif text-center">Why Choose Our Drone Services?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                "FAA Part 107 Certified - fully licensed and insured",
                "High-resolution 4K video and photography",
                "Land, sea, and coastal capabilities",
                "Fast turnaround on deliverables",
                "Professional editing and post-processing",
                "Competitive pricing for all project sizes",
                "Experienced pilot with attention to detail",
                "Flexible scheduling including weekends"
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-10 text-center text-white">
            <h2 className="text-3xl font-bold mb-4 font-serif">Ready to Take Your Project to New Heights?</h2>
            <p className="text-lg mb-6 opacity-90">Contact us for a free consultation and quote</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:dradamopierce@gmail.com" className="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-bold rounded-full hover:from-amber-600 hover:to-yellow-500 transition-all">
                Get a Quote
              </a>
              <a href="tel:760-575-4876" className="px-8 py-4 bg-white/20 text-white font-bold rounded-full hover:bg-white/30 transition-all">
                Call: 760-575-4876
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-indigo-200">
          <p className="text-gray-600 text-lg">&copy; 2025 Faith & Harmony LLC. All rights reserved.</p>
          <p className="text-indigo-700 text-sm mt-2 font-semibold">Dr. Adam Pierce - Rooted in Purpose, Driven by Service</p>
        </footer>
      </div>
    </div>
  );
};

export default AerialPhotography;
