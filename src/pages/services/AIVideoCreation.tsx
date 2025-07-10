import { Link } from "react-router-dom";

const AIVideoCreation = () => {
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
          <div className="text-6xl mb-6">🎥</div>
          <h1 className="text-5xl font-bold mb-6 text-indigo-900 font-serif">
            AI Video Creation & Content Automation
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
            Amplify your voice and streamline your content creation with cutting-edge AI tools designed to help you tell powerful stories efficiently and professionally.
          </p>
        </section>

        {/* What We Offer */}
        <section className="mb-16 bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">What We Offer</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">AI-Powered Video Production</h3>
                <p className="text-gray-700">Transform your ideas into professional videos using advanced AI tools for scripting, voiceovers, and visual creation.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Automated Content Workflows</h3>
                <p className="text-gray-700">Set up systems that automatically generate social media content, newsletters, and marketing materials from your core content.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Educational Content Creation</h3>
                <p className="text-gray-700">Develop engaging educational videos and training materials for schools, churches, and community organizations.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Brand Storytelling</h3>
                <p className="text-gray-700">Craft compelling narratives that showcase your mission, values, and impact in the community.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who This Helps */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Who This Helps</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Content Creators", description: "Individuals looking to scale their content production without sacrificing quality or authenticity." },
              { title: "Churches & Ministries", description: "Religious organizations wanting to reach wider audiences with sermons, testimonies, and community stories." },
              { title: "Small Businesses", description: "Entrepreneurs needing professional marketing content on a budget." },
              { title: "Educators", description: "Teachers and trainers creating engaging educational materials." },
              { title: "Community Leaders", description: "Activists and organizers sharing important messages and mobilizing their communities." },
              { title: "Nonprofits", description: "Organizations telling impact stories to attract donors and volunteers." }
            ].map((item, index) => (
              <div key={index} className="bg-white/90 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-indigo-900 mb-3">{item.title}</h3>
                <p className="text-gray-700">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="mb-16 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-10 shadow-2xl text-white">
          <h2 className="text-4xl font-bold mb-8 text-center font-serif">Why Choose Faith & Harmony</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Cultural Understanding</h3>
              <p className="mb-6">We understand the unique needs of Black and faith-based communities, ensuring your content resonates authentically.</p>
              <h3 className="text-xl font-bold mb-4">Technical Excellence</h3>
              <p>Dr. Pierce's background in cybersecurity and automation ensures you get cutting-edge solutions that actually work.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Purpose-Driven Approach</h3>
              <p className="mb-6">Every project is designed to amplify positive impact and serve your community's needs.</p>
              <h3 className="text-xl font-bold mb-4">End-to-End Support</h3>
              <p>From strategy and creation to distribution and automation, we handle the entire content lifecycle.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-indigo-900 font-serif">Ready to Amplify Your Voice?</h2>
          <p className="text-xl text-gray-700 mb-8">Let's discuss how AI-powered content creation can transform your message and reach.</p>
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

export default AIVideoCreation;