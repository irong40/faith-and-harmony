import { Link } from "react-router-dom";

const BlackHistoryStorytelling = () => {
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
          <div className="text-6xl mb-6">📚</div>
          <h1 className="text-5xl font-bold mb-6 text-indigo-900 font-serif">
            Black History Storytelling Packages
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
            Uncover, celebrate, and share the rich tapestry of Black history through compelling narratives that educate, inspire, and honor our heritage.
          </p>
        </section>

        {/* What We Create */}
        <section className="mb-16 bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Stories That Shape the Future</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Custom Historical Narratives</h3>
                <p className="text-gray-700">Research and craft compelling stories about local Black history, unsung heroes, and community achievements.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Educational Content Packages</h3>
                <p className="text-gray-700">Comprehensive educational materials including videos, presentations, and interactive content for schools and organizations.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Family Legacy Projects</h3>
                <p className="text-gray-700">Document and preserve individual family histories, creating lasting legacies for future generations.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Community Documentary Series</h3>
                <p className="text-gray-700">Multi-part video series exploring the rich history and contributions of local Black communities.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Interactive Museum Exhibits</h3>
                <p className="text-gray-700">Digital and physical exhibits that bring Black history to life through immersive storytelling.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Cultural Heritage Archives</h3>
                <p className="text-gray-700">Digital preservation of photographs, documents, and oral histories for communities and organizations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Approach */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Our Storytelling Process</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { 
                step: "1", 
                title: "Research & Discovery", 
                description: "Deep dive into archives, interviews, and community connections to uncover authentic stories." 
              },
              { 
                step: "2", 
                title: "Narrative Development", 
                description: "Craft compelling narratives that honor the truth while engaging modern audiences." 
              },
              { 
                step: "3", 
                title: "Multimedia Production", 
                description: "Create videos, audio content, and interactive materials that bring stories to life." 
              },
              { 
                step: "4", 
                title: "Community Sharing", 
                description: "Develop distribution strategies to ensure stories reach and impact the right audiences." 
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

        {/* Who We Serve */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Who We Partner With</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                title: "Schools & Universities", 
                description: "Educational institutions seeking authentic Black history content for curriculum development and special programs.",
                icon: "🎓"
              },
              { 
                title: "Museums & Cultural Centers", 
                description: "Organizations dedicated to preserving and sharing Black history and culture with the public.",
                icon: "🏛️"
              },
              { 
                title: "Community Organizations", 
                description: "Churches, nonprofits, and community groups celebrating their heritage and educating their members.",
                icon: "🤝"
              },
              { 
                title: "Families & Individuals", 
                description: "People who want to document and preserve their family history for future generations.",
                icon: "👨‍👩‍👧‍👦"
              },
              { 
                title: "Businesses & Corporations", 
                description: "Companies seeking to honor Black history and culture in their marketing and community outreach.",
                icon: "🏢"
              },
              { 
                title: "Media & Publishing", 
                description: "Content creators and publishers looking for authentic Black history stories and research.",
                icon: "📺"
              }
            ].map((item, index) => (
              <div key={index} className="bg-white/90 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-indigo-900 mb-3">{item.title}</h3>
                <p className="text-gray-700">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why This Matters */}
        <section className="mb-16 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-10 shadow-2xl text-white">
          <h2 className="text-4xl font-bold mb-8 text-center font-serif">Why Black History Storytelling Matters</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">🌟 Reclaiming Our Narrative</h3>
              <p className="mb-6">Too many stories have been untold or misrepresented. We help communities reclaim their narrative and share their truth.</p>
              <h3 className="text-xl font-bold mb-4">👥 Building Community Pride</h3>
              <p>When people know their history, they feel connected to something greater and develop stronger community bonds.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">📖 Educating Future Generations</h3>
              <p className="mb-6">Young people deserve to know the full story of their heritage, including the triumphs and contributions of their ancestors.</p>
              <h3 className="text-xl font-bold mb-4">🏛️ Preserving Cultural Legacy</h3>
              <p>Every story saved is a piece of culture preserved for future generations to learn from and build upon.</p>
            </div>
          </div>
        </section>

        {/* Featured Story Types */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Story Specializations</h2>
          <div className="bg-white/90 rounded-3xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                "Unsung Heroes & Pioneers",
                "Local Community Achievements", 
                "Business & Economic History",
                "Educational Institutions",
                "Cultural & Artistic Contributions",
                "Civil Rights & Social Justice",
                "Military Service & Sacrifice",
                "Religious & Spiritual Heritage",
                "Family Immigration Stories"
              ].map((specialty, index) => (
                <div key={index} className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border-l-4 border-amber-500">
                  <p className="text-indigo-900 font-semibold">{specialty}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-indigo-900 font-serif">Ready to Share Your Story?</h2>
          <p className="text-xl text-gray-700 mb-8">Every community has stories worth telling. Let's uncover yours and share them with the world.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="px-10 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-semibold text-lg rounded-full hover:from-amber-600 hover:to-yellow-500 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Start Your Story Project
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

export default BlackHistoryStorytelling;