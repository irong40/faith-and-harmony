
const Index = () => {
  return (
    <div className="min-h-screen bg-[#f9f6f1] py-8">
      <div className="max-w-4xl mx-auto px-8 font-sans text-gray-800 leading-relaxed">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 text-gray-900">Faith & Harmony LLC</h1>
          <p className="text-xl text-gray-700 italic">Where Innovation Meets Legacy</p>
        </header>

        {/* About Us Section */}
        <section className="mb-8">
          <h2 className="text-3xl font-semibold mb-4 text-gray-900">About Us</h2>
          <p className="text-lg text-gray-700 leading-7">
            Faith & Harmony LLC is a purpose-driven company that blends audio/visual consulting, cultural merchandise, and digital innovation. 
            We work at the intersection of community, creativity, and technology to support churches, educators, and entrepreneurs.
          </p>
        </section>

        {/* Our Services Section */}
        <section className="mb-8">
          <h2 className="text-3xl font-semibold mb-4 text-gray-900">Our Services</h2>
          <ul className="list-none pl-0 text-lg text-gray-700 space-y-3">
            <li className="flex items-center">
              <span className="text-2xl mr-3">🎧</span>
              AV Consulting for churches and events
            </li>
            <li className="flex items-center">
              <span className="text-2xl mr-3">🛠️</span>
              Custom digital tools like Vendor Assistant
            </li>
            <li className="flex items-center">
              <span className="text-2xl mr-3">🎷</span>
              Gospel Music projects and education
            </li>
            <li className="flex items-center">
              <span className="text-2xl mr-3">🛍️</span>
              Cultural merchandise and event support
            </li>
          </ul>
        </section>

        {/* Current Projects Section */}
        <section className="mb-8">
          <h2 className="text-3xl font-semibold mb-4 text-gray-900">Current Projects</h2>
          <ul className="list-none pl-0 text-lg text-gray-700 space-y-4">
            <li>
              <strong className="text-gray-900">Sentinel AI:</strong> An AI-powered cybersecurity assessment platform.
            </li>
            <li>
              <strong className="text-gray-900">Vendor Assistant:</strong> A plug-and-play automation toolkit for pop-up vendors.
            </li>
            <li>
              <strong className="text-gray-900">Faith in Harmony Music:</strong> Gospel saxophone training with spiritual devotion.
            </li>
          </ul>
        </section>

        {/* Contact Us Section */}
        <section className="mb-8">
          <h2 className="text-3xl font-semibold mb-4 text-gray-900">Contact Us</h2>
          <p className="text-lg text-gray-700">
            Email us at{" "}
            <a 
              href="mailto:info@faithandharmonyllc.com" 
              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              info@faithandharmonyllc.com
            </a>
          </p>
        </section>

        {/* Footer */}
        <footer className="text-center mt-12 pt-8 border-t border-gray-300">
          <p className="text-gray-600">
            &copy; 2025 Faith & Harmony LLC. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
