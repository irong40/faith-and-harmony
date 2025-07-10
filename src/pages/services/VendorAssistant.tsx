import { Link } from "react-router-dom";

const VendorAssistant = () => {
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
          <div className="text-6xl mb-6">🧾</div>
          <h1 className="text-5xl font-bold mb-6 text-indigo-900 font-serif">
            Vendor Assistant Systems for Events
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
            Streamline your event operations with intelligent automation tools designed to help vendors, organizers, and entrepreneurs succeed at markets, festivals, and pop-up events.
          </p>
        </section>

        {/* What We Offer */}
        <section className="mb-16 bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Complete Event Automation</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Smart Inventory Management</h3>
                <p className="text-gray-700">AI-powered systems that track your products, predict demand, and alert you when it's time to restock.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Automated Payment Processing</h3>
                <p className="text-gray-700">Seamless payment solutions that accept cards, mobile payments, and cash with automatic reconciliation.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Customer Relationship Management</h3>
                <p className="text-gray-700">Build customer databases, send follow-up communications, and create loyalty programs that bring people back.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Event Analytics Dashboard</h3>
                <p className="text-gray-700">Real-time insights into sales performance, popular products, and customer behavior to optimize your strategy.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Multi-Event Coordination</h3>
                <p className="text-gray-700">Manage multiple events simultaneously with centralized scheduling, inventory allocation, and staff coordination.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Marketing Automation</h3>
                <p className="text-gray-700">Automated social media posts, email campaigns, and promotional materials to drive traffic to your booth.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who This Helps */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Entrepreneurs We Empower</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                title: "Pop-Up Vendors", 
                description: "Mobile entrepreneurs selling at farmers markets, festivals, and street fairs.",
                needs: ["Quick setup", "Mobile payments", "Inventory tracking"]
              },
              { 
                title: "Food Truck Operators", 
                description: "Mobile food businesses managing orders, inventory, and customer relationships.",
                needs: ["Order management", "Supply tracking", "Customer loyalty"]
              },
              { 
                title: "Craft & Art Vendors", 
                description: "Artists and crafters selling handmade goods at various events and markets.",
                needs: ["Product catalogs", "Commission tracking", "Customer follow-up"]
              },
              { 
                title: "Event Organizers", 
                description: "People managing vendor coordination for festivals, markets, and community events.",
                needs: ["Vendor management", "Space allocation", "Payment processing"]
              },
              { 
                title: "Community Fundraisers", 
                description: "Churches and nonprofits running fundraising events and selling products.",
                needs: ["Donation tracking", "Event coordination", "Volunteer management"]
              },
              { 
                title: "Seasonal Businesses", 
                description: "Businesses that operate during specific seasons or special events.",
                needs: ["Flexible systems", "Quick deployment", "Seasonal analytics"]
              }
            ].map((item, index) => (
              <div key={index} className="bg-white/90 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-bold text-indigo-900 mb-3">{item.title}</h3>
                <p className="text-gray-700 mb-4">{item.description}</p>
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-sm font-semibold text-indigo-800 mb-2">Key Needs:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {item.needs.map((need, needIndex) => (
                      <li key={needIndex}>• {need}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* System Features */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Smart Features That Drive Success</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { 
                icon: "📱", 
                title: "Mobile-First Design", 
                description: "Everything works perfectly on your phone or tablet for true mobility." 
              },
              { 
                icon: "☁️", 
                title: "Cloud Synchronization", 
                description: "All your data syncs automatically across devices and locations." 
              },
              { 
                icon: "📊", 
                title: "Real-Time Analytics", 
                description: "See your performance metrics update live as you make sales." 
              },
              { 
                icon: "🔗", 
                title: "Integration Ready", 
                description: "Connect with existing payment processors, accounting software, and more." 
              },
              { 
                icon: "🤖", 
                title: "AI Recommendations", 
                description: "Get intelligent suggestions for pricing, inventory, and marketing." 
              },
              { 
                icon: "📧", 
                title: "Automated Follow-Up", 
                description: "Stay connected with customers through automated email and SMS." 
              },
              { 
                icon: "💳", 
                title: "Universal Payments", 
                description: "Accept any payment method your customers prefer." 
              },
              { 
                icon: "📋", 
                title: "Offline Capability", 
                description: "Keep working even when internet connection is spotty." 
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white/90 rounded-2xl p-6 shadow-lg text-center hover:shadow-xl transition-all duration-300">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-indigo-900 mb-3">{feature.title}</h3>
                <p className="text-gray-700">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Success Stories Preview */}
        <section className="mb-16 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-10 shadow-2xl text-white">
          <h2 className="text-4xl font-bold mb-8 text-center font-serif">Real Results for Real Entrepreneurs</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">3x</div>
              <p className="text-lg">Average increase in sales efficiency</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">75%</div>
              <p className="text-lg">Reduction in setup time per event</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">90%</div>
              <p className="text-lg">Customer satisfaction with automated systems</p>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-lg italic">"The vendor assistant system transformed how we operate at markets. We went from chaos to organized efficiency, and our sales doubled!" - Maria, Local Artisan</p>
          </div>
        </section>

        {/* Implementation Process */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Getting Started is Simple</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { 
                step: "1", 
                title: "Discovery Call", 
                description: "We learn about your business, events, and specific challenges." 
              },
              { 
                step: "2", 
                title: "Custom Setup", 
                description: "We configure the system to match your products, processes, and preferences." 
              },
              { 
                step: "3", 
                title: "Training & Testing", 
                description: "We train your team and test everything before your next event." 
              },
              { 
                step: "4", 
                title: "Launch & Support", 
                description: "Go live with confidence knowing we're here to support your success." 
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

        {/* Pricing Preview */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Affordable Solutions for Every Size</h2>
          <div className="bg-white/90 rounded-3xl p-8 shadow-lg text-center">
            <p className="text-xl text-gray-700 mb-6">Our vendor assistant systems start as low as <span className="font-bold text-indigo-800">$49/month</span> with no setup fees.</p>
            <p className="text-lg text-gray-600 mb-6">Custom pricing available for event organizers managing multiple vendors.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-semibold rounded-full hover:from-amber-600 hover:to-yellow-500 transition-all duration-300">
                Get Custom Quote
              </button>
              <button className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-full hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300">
                Try Free Demo
              </button>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-indigo-900 font-serif">Ready to Automate Your Success?</h2>
          <p className="text-xl text-gray-700 mb-8">Stop managing your events manually. Let our intelligent systems handle the details while you focus on serving customers.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="px-10 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-semibold text-lg rounded-full hover:from-amber-600 hover:to-yellow-500 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Schedule Free Consultation
            </button>
            <Link to="/services" className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-lg rounded-full hover:from-indigo-700 hover:to-indigo-800 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              View All Services
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VendorAssistant;