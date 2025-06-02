
const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9f6f1] to-[#f5f0e8] py-12">
      <div className="max-w-5xl mx-auto px-8 font-serif text-gray-800">
        {/* Header */}
        <header className="text-center mb-16 animate-fade-in">
          <h1 className="text-6xl font-bold mb-4 text-gray-900 tracking-tight leading-tight">
            Faith & Harmony LLC
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-amber-600 to-amber-400 mx-auto mb-6 rounded-full"></div>
          <p className="text-2xl text-gray-600 italic font-light tracking-wide">
            Where Innovation Meets Legacy
          </p>
        </header>

        {/* About Us Section */}
        <section className="mb-16 bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
          <h2 className="text-4xl font-bold mb-6 text-gray-900 text-center">About Us</h2>
          <p className="text-xl text-gray-700 leading-8 text-center max-w-4xl mx-auto font-light">
            Faith & Harmony LLC is a purpose-driven company that blends audio/visual consulting, cultural merchandise, and digital innovation. 
            We work at the intersection of community, creativity, and technology to support churches, educators, and entrepreneurs.
          </p>
        </section>

        {/* Our Services Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-10 text-gray-900 text-center">Our Services</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "🎧", text: "AV Consulting for churches and events" },
              { icon: "🛠️", text: "Custom digital tools like Vendor Assistant" },
              { icon: "🎷", text: "Gospel Music projects and education" },
              { icon: "🛍️", text: "Cultural merchandise and event support" }
            ].map((service, index) => (
              <div key={index} className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                <div className="flex items-center space-x-4">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </span>
                  <p className="text-lg text-gray-700 font-medium">
                    {service.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Current Projects Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-10 text-gray-900 text-center">Current Projects</h2>
          <div className="space-y-6">
            {[
              { title: "Sentinel AI", description: "An AI-powered cybersecurity assessment platform." },
              { title: "Vendor Assistant", description: "A plug-and-play automation toolkit for pop-up vendors." },
              { title: "Faith in Harmony Music", description: "Gospel saxophone training with spiritual devotion." }
            ].map((project, index) => (
              <div key={index} className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-amber-500">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{project.title}</h3>
                <p className="text-lg text-gray-700">{project.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Us Section */}
        <section className="mb-16 bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-4xl font-bold mb-6 text-gray-900">Contact Us</h2>
          <p className="text-xl text-gray-700 mb-4">Ready to start your project?</p>
          <a 
            href="mailto:info@faithandharmonyllc.com" 
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold text-lg rounded-full hover:from-amber-700 hover:to-amber-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            info@faithandharmonyllc.com
          </a>
        </section>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-gray-200">
          <p className="text-gray-500 text-lg font-light">
            &copy; 2025 Faith & Harmony LLC. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
