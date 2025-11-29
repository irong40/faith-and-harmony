import { Link } from "react-router-dom";
import { Globe, CheckCircle, Code, Server, Palette, Zap, Shield, Headphones } from "lucide-react";

const WebsiteHosting = () => {
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
            <Globe className="w-12 h-12 text-indigo-700" />
          </div>
          <h1 className="text-5xl font-bold mb-4 text-indigo-900 font-serif">Website Hosting & Development</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 mx-auto mb-6 rounded-full"></div>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Professional website design, development, and hosting services tailored for small businesses, 
            organizations, and entrepreneurs. We build beautiful, functional websites that grow with you.
          </p>
        </section>

        {/* Services Grid */}
        <section className="pb-16">
          <h2 className="text-3xl font-bold mb-8 text-indigo-900 font-serif text-center">Our Web Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Palette, title: "Custom Web Design", description: "Beautiful, modern designs tailored to your brand identity and business goals" },
              { icon: Code, title: "Web Development", description: "Responsive, fast-loading websites built with modern technologies" },
              { icon: Server, title: "Reliable Hosting", description: "Secure, fast hosting with 99.9% uptime guarantee and daily backups" },
              { icon: Zap, title: "Performance Optimization", description: "Speed optimization, SEO, and performance tuning for better rankings" },
              { icon: Shield, title: "Security & SSL", description: "Free SSL certificates, malware protection, and regular security updates" },
              { icon: Headphones, title: "Ongoing Support", description: "Maintenance, updates, and technical support when you need it" }
            ].map((service, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                <service.icon className="w-10 h-10 text-indigo-600 mb-4" />
                <h3 className="text-xl font-bold text-indigo-900 mb-2">{service.title}</h3>
                <p className="text-gray-700">{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Packages */}
        <section className="pb-16">
          <h2 className="text-3xl font-bold mb-8 text-indigo-900 font-serif text-center">Packages</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "Starting at $499",
                features: ["5-page responsive website", "Mobile-friendly design", "Basic SEO setup", "Contact form", "1 year hosting included", "Email support"]
              },
              {
                name: "Professional",
                price: "Starting at $999",
                features: ["Up to 15 pages", "Custom design", "Advanced SEO", "Blog integration", "Social media integration", "Priority support", "Monthly maintenance"],
                popular: true
              },
              {
                name: "Enterprise",
                price: "Custom Quote",
                features: ["Unlimited pages", "E-commerce integration", "Custom functionality", "Database integration", "API development", "24/7 support", "Dedicated hosting"]
              }
            ].map((pkg, index) => (
              <div key={index} className={`bg-white rounded-xl p-6 shadow-lg ${pkg.popular ? 'ring-2 ring-amber-500 relative' : ''}`}>
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-sm px-4 py-1 rounded-full font-semibold">
                    Most Popular
                  </span>
                )}
                <h3 className="text-2xl font-bold text-indigo-900 mb-2">{pkg.name}</h3>
                <p className="text-3xl font-bold text-indigo-700 mb-6">{pkg.price}</p>
                <ul className="space-y-3">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* What We Build */}
        <section className="pb-16">
          <div className="bg-white rounded-3xl p-10 shadow-xl">
            <h2 className="text-3xl font-bold mb-8 text-indigo-900 font-serif text-center">What We Build</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                "Business Websites",
                "Church & Ministry Sites",
                "Portfolio Sites",
                "Landing Pages",
                "E-commerce Stores",
                "Membership Sites",
                "Event Websites",
                "Non-profit Sites",
                "Blogs & Publications",
                "Organization Sites",
                "Real Estate Sites",
                "Service Directories"
              ].map((item, index) => (
                <div key={index} className="bg-indigo-50 rounded-lg p-3 text-center text-indigo-900 font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-10 text-center text-white">
            <h2 className="text-3xl font-bold mb-4 font-serif">Ready to Launch Your Website?</h2>
            <p className="text-lg mb-6 opacity-90">Let's discuss your project and create something amazing together</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:dradamopierce@gmail.com" className="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-bold rounded-full hover:from-amber-600 hover:to-yellow-500 transition-all">
                Start Your Project
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

export default WebsiteHosting;
