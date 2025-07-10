import { Link } from "react-router-dom";

const MasonicDigitalProjects = () => {
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
          <div className="text-6xl mb-6">🏛️</div>
          <h1 className="text-5xl font-bold mb-6 text-indigo-900 font-serif">
            Masonic & OES Digital Projects
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
            Preserve sacred traditions while embracing modern technology. We help Masonic lodges and OES chapters digitize their legacy and connect their communities.
          </p>
        </section>

        {/* What We Offer */}
        <section className="mb-16 bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Sacred Technology Solutions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Digital Preservation of Rituals</h3>
                <p className="text-gray-700">Securely digitize and preserve ceremonial content, historical documents, and traditional practices for future generations.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Virtual Meeting Platforms</h3>
                <p className="text-gray-700">Custom-built secure platforms for conducting lodge meetings, degree work, and educational sessions online.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Membership Management Systems</h3>
                <p className="text-gray-700">Comprehensive databases for tracking membership, dues, attendance, and fraternal progress.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Educational Content Libraries</h3>
                <p className="text-gray-700">Interactive digital libraries containing lectures, historical resources, and educational materials.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Secure Communication Tools</h3>
                <p className="text-gray-700">Encrypted messaging and document sharing systems that maintain the privacy and security of fraternal communications.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Digital Certificates & Records</h3>
                <p className="text-gray-700">Modern systems for issuing and tracking digital certificates, awards, and membership credentials.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Organizations We Serve</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Masonic Lodges", description: "Blue lodges, Scottish Rite, York Rite, and other Masonic bodies seeking digital transformation." },
              { title: "Order of Eastern Star", description: "OES chapters looking to modernize their operations while preserving traditions." },
              { title: "Prince Hall Organizations", description: "Historic fraternal organizations embracing technology for growth and preservation." },
              { title: "Other Fraternal Groups", description: "Knights of Pythias, Odd Fellows, and similar organizations with rich traditions." }
            ].map((item, index) => (
              <div key={index} className="bg-white/90 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-lg font-bold text-indigo-900 mb-3">{item.title}</h3>
                <p className="text-gray-700">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why This Matters */}
        <section className="mb-16 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-10 shadow-2xl text-white">
          <h2 className="text-4xl font-bold mb-8 text-center font-serif">Why Digital Preservation Matters</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">🏛️ Legacy Preservation</h3>
              <p>Ensure that centuries-old traditions and wisdom are preserved for future generations in accessible digital formats.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">🌐 Global Connection</h3>
              <p>Connect brothers and sisters across distances, enabling participation regardless of geographic limitations.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">🔒 Security & Privacy</h3>
              <p>Maintain the sacred nature of fraternal work through advanced encryption and secure access controls.</p>
            </div>
          </div>
        </section>

        {/* Our Approach */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Our Respectful Approach</h2>
          <div className="bg-white/90 rounded-3xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-indigo-800 mb-4">Understanding Sacred Traditions</h3>
                <p className="text-gray-700 mb-4">Dr. Pierce brings deep respect for fraternal traditions and understands the balance between preserving ancient wisdom and embracing modern tools.</p>
                <p className="text-gray-700">Every solution is designed with the utmost respect for the sacred nature of Masonic and OES work.</p>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-indigo-800 mb-4">Security-First Mindset</h3>
                <p className="text-gray-700 mb-4">With a background in cybersecurity, we ensure that all digital systems maintain the highest levels of security and privacy.</p>
                <p className="text-gray-700">Your fraternal communications and documents remain protected and accessible only to authorized members.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-indigo-900 font-serif">Ready to Modernize Your Lodge?</h2>
          <p className="text-xl text-gray-700 mb-8">Let's discuss how digital tools can strengthen your fraternal bonds while preserving your sacred traditions.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="px-10 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-semibold text-lg rounded-full hover:from-amber-600 hover:to-yellow-500 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Schedule Lodge Consultation
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

export default MasonicDigitalProjects;