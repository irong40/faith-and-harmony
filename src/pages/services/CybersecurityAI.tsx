import { Link } from "react-router-dom";

const CybersecurityAI = () => {
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
          <div className="text-6xl mb-6">🛡️</div>
          <h1 className="text-5xl font-bold mb-6 text-indigo-900 font-serif">
            Cybersecurity AI Tools (Sentinel AI)
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
            Protect your digital assets and community data with intelligent security solutions designed specifically for small businesses, churches, and community organizations.
          </p>
        </section>

        {/* What Is Sentinel AI */}
        <section className="mb-16 bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Meet Sentinel AI</h2>
          <div className="text-center mb-8">
            <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
              Sentinel AI is our flagship cybersecurity platform that democratizes enterprise-level security for smaller organizations. Built by Dr. Adam Pierce with years of cybersecurity expertise, it makes advanced threat protection accessible and affordable.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">AI-Powered Threat Detection</h3>
                <p className="text-gray-700">Advanced machine learning algorithms continuously monitor your systems for suspicious activity and potential threats.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Automated Security Assessments</h3>
                <p className="text-gray-700">Regular, comprehensive security audits that identify vulnerabilities before attackers can exploit them.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Real-Time Monitoring</h3>
                <p className="text-gray-700">24/7 surveillance of your network, applications, and data with instant alerts for security incidents.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Smart Response Automation</h3>
                <p className="text-gray-700">Intelligent automated responses to common threats, reducing response time from hours to seconds.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Community-Focused Security</h3>
                <p className="text-gray-700">Specialized protection for the unique needs of churches, nonprofits, and community organizations.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Simple Dashboard Interface</h3>
                <p className="text-gray-700">Easy-to-understand security status and recommendations, no technical expertise required.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who Needs This */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Who Needs Cybersecurity Protection</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                title: "Churches & Ministries", 
                description: "Protect member data, donation processing, and digital ministry platforms from cyber threats.",
                risks: ["Member personal data", "Financial records", "Live streaming platforms"]
              },
              { 
                title: "Small Businesses", 
                description: "Safeguard customer information, business operations, and financial transactions.",
                risks: ["Customer databases", "Payment processing", "Business communications"]
              },
              { 
                title: "Nonprofits", 
                description: "Secure donor information, program data, and organizational communications.",
                risks: ["Donor information", "Grant data", "Volunteer records"]
              },
              { 
                title: "Community Organizations", 
                description: "Protect member information and maintain trust within your community.",
                risks: ["Member directories", "Event planning data", "Communication platforms"]
              },
              { 
                title: "Educational Institutions", 
                description: "Secure student records, educational content, and administrative systems.",
                risks: ["Student records", "Financial aid data", "Research information"]
              },
              { 
                title: "Healthcare Practices", 
                description: "Ensure HIPAA compliance and protect sensitive patient information.",
                risks: ["Patient records", "Insurance data", "Medical billing"]
              }
            ].map((item, index) => (
              <div key={index} className="bg-white/90 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-bold text-indigo-900 mb-3">{item.title}</h3>
                <p className="text-gray-700 mb-4">{item.description}</p>
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-sm font-semibold text-indigo-800 mb-2">At Risk:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {item.risks.map((risk, riskIndex) => (
                      <li key={riskIndex}>• {risk}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why Cybersecurity Matters */}
        <section className="mb-16 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-10 shadow-2xl text-white">
          <h2 className="text-4xl font-bold mb-8 text-center font-serif">Why Cybersecurity Can't Wait</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">🎯 You're Already a Target</h3>
              <p className="mb-6">Small organizations are often targeted because they have valuable data but typically lack robust security measures.</p>
              <h3 className="text-xl font-bold mb-4">💰 The Cost of a Breach</h3>
              <p>Data breaches can cost small organizations tens of thousands of dollars in recovery, legal fees, and lost trust.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">⚡ Threats Are Evolving</h3>
              <p className="mb-6">Cybercriminals use AI and automation to launch more sophisticated attacks than ever before.</p>
              <h3 className="text-xl font-bold mb-4">🛡️ Prevention vs. Recovery</h3>
              <p>Preventing a cyber attack is always less expensive and disruptive than recovering from one.</p>
            </div>
          </div>
        </section>

        {/* Our Approach */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Our Security Philosophy</h2>
          <div className="bg-white/90 rounded-3xl p-8 shadow-lg">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full flex items-center justify-center text-indigo-900 font-bold text-2xl mb-4 mx-auto">
                  1
                </div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Accessible Security</h3>
                <p className="text-gray-700">Enterprise-level protection designed for organizations without dedicated IT teams.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full flex items-center justify-center text-indigo-900 font-bold text-2xl mb-4 mx-auto">
                  2
                </div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Community-Centered</h3>
                <p className="text-gray-700">Understanding the unique needs and constraints of community organizations.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full flex items-center justify-center text-indigo-900 font-bold text-2xl mb-4 mx-auto">
                  3
                </div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Proactive Protection</h3>
                <p className="text-gray-700">Identifying and stopping threats before they can cause damage to your organization.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Service Packages */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Protection Packages</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Essential Shield",
                price: "Starting at $99/month",
                features: ["Basic threat monitoring", "Monthly security assessments", "Email security", "Basic incident response"],
                ideal: "Small churches and startups"
              },
              {
                name: "Guardian Pro",
                price: "Starting at $299/month", 
                features: ["Advanced AI monitoring", "Weekly assessments", "Automated threat response", "Staff security training"],
                ideal: "Growing organizations",
                popular: true
              },
              {
                name: "Fortress Enterprise",
                price: "Custom pricing",
                features: ["24/7 monitoring", "Real-time response", "Compliance support", "Dedicated security advisor"],
                ideal: "Large organizations"
              }
            ].map((package_, index) => (
              <div key={index} className={`bg-white/90 rounded-2xl p-6 shadow-lg ${package_.popular ? 'ring-2 ring-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50' : ''}`}>
                {package_.popular && (
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-bold text-sm px-3 py-1 rounded-full inline-block mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-indigo-900 mb-2">{package_.name}</h3>
                <p className="text-2xl font-bold text-indigo-800 mb-4">{package_.price}</p>
                <ul className="space-y-2 mb-6">
                  {package_.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="text-gray-700">• {feature}</li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 italic">Ideal for: {package_.ideal}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-indigo-900 font-serif">Protect Your Digital Assets Today</h2>
          <p className="text-xl text-gray-700 mb-8">Don't wait for a security incident to take action. Let Sentinel AI protect what matters most to your organization.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="px-10 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-semibold text-lg rounded-full hover:from-amber-600 hover:to-yellow-500 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Get Free Security Assessment
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

export default CybersecurityAI;