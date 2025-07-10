import { Link } from "react-router-dom";

const ChurchTech = () => {
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
          <div className="text-6xl mb-6">🎷</div>
          <h1 className="text-5xl font-bold mb-6 text-indigo-900 font-serif">
            Church Tech & Gospel Saxophone Programs
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
            Enhance your worship experience through cutting-edge technology and soulful music education, bridging the gap between traditional gospel and modern innovation.
          </p>
        </section>

        {/* Dual Focus */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Technology Meets Ministry</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Church Technology */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">⛪</div>
                <h3 className="text-3xl font-bold text-indigo-900 font-serif">Church Technology Solutions</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-indigo-800 mb-2">Audio/Visual Consulting</h4>
                  <p className="text-gray-700">Complete sound system design, installation, and optimization for worship spaces of all sizes.</p>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-indigo-800 mb-2">Live Streaming Setup</h4>
                  <p className="text-gray-700">Professional broadcast solutions to reach your congregation online with high-quality video and audio.</p>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-indigo-800 mb-2">Hybrid Worship Systems</h4>
                  <p className="text-gray-700">Seamlessly blend in-person and virtual worship experiences for maximum engagement.</p>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-indigo-800 mb-2">Digital Ministry Platforms</h4>
                  <p className="text-gray-700">Custom apps and websites for sermon archives, prayer requests, and community connection.</p>
                </div>
              </div>
            </div>

            {/* Gospel Saxophone */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🎺</div>
                <h3 className="text-3xl font-bold text-indigo-900 font-serif">Gospel Saxophone Programs</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-indigo-800 mb-2">Individual Music Lessons</h4>
                  <p className="text-gray-700">Personalized saxophone instruction focusing on gospel techniques, improvisation, and spiritual expression.</p>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-indigo-800 mb-2">Church Musician Training</h4>
                  <p className="text-gray-700">Specialized programs for musicians serving in worship ministries, covering both technical and spiritual aspects.</p>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-indigo-800 mb-2">Youth Music Programs</h4>
                  <p className="text-gray-700">Engaging programs that teach young people to express their faith through music and develop their talents.</p>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-indigo-800 mb-2">Recording & Production</h4>
                  <p className="text-gray-700">Professional recording services for church albums, special performances, and musical testimonies.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Integrated Solutions */}
        <section className="mb-16 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-10 shadow-2xl text-white">
          <h2 className="text-4xl font-bold mb-8 text-center font-serif">Where Technology and Music Unite</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">🎤 Hybrid Musician Setup</h3>
              <p>Integrate live saxophone performance with digital backing tracks, effects processing, and streaming technology for dynamic worship experiences.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">🎹 Digital Music Education</h3>
              <p>Online learning platforms that combine traditional music theory with gospel techniques, accessible from anywhere.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">📱 Ministry Apps with Music</h3>
              <p>Custom church applications that include music libraries, hymnal access, and interactive worship features.</p>
            </div>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Churches & Musicians We Support</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                title: "Traditional Black Churches", 
                description: "Historic congregations seeking to enhance worship while preserving their musical heritage.",
                icon: "⛪"
              },
              { 
                title: "Growing Ministries", 
                description: "Churches expanding their reach through improved technology and music programs.",
                icon: "📈"
              },
              { 
                title: "Youth-Focused Churches", 
                description: "Congregations wanting to engage younger generations through modern technology and music.",
                icon: "👥"
              },
              { 
                title: "Community Churches", 
                description: "Local congregations serving their neighborhoods with limited technical resources.",
                icon: "🏘️"
              },
              { 
                title: "Aspiring Musicians", 
                description: "Individuals called to serve God through music, seeking spiritual and technical development.",
                icon: "🎵"
              },
              { 
                title: "Music Ministers", 
                description: "Worship leaders and musicians wanting to enhance their ministry through better technology.",
                icon: "🎼"
              }
            ].map((item, index) => (
              <div key={index} className="bg-white/90 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-4xl mb-4 text-center">{item.icon}</div>
                <h3 className="text-lg font-bold text-indigo-900 mb-3 text-center">{item.title}</h3>
                <p className="text-gray-700 text-center">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dr. Pierce's Background */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Led by Faith and Experience</h2>
          <div className="bg-white/90 rounded-3xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold text-indigo-800 mb-4">Dr. Adam Pierce</h3>
                <p className="text-gray-700 mb-4">
                  Dr. Pierce brings together his deep faith, musical passion, and technical expertise to serve churches and musicians. 
                  As both a cybersecurity professional and gospel saxophone player, he understands the unique challenges of 
                  integrating technology with spiritual ministry.
                </p>
                <p className="text-gray-700 mb-4">
                  His approach combines reverence for traditional worship with practical innovation, ensuring that technology 
                  enhances rather than distracts from the spiritual experience.
                </p>
                <p className="text-gray-700">
                  Whether you need a complete church audio overhaul or want to learn gospel saxophone, Dr. Pierce brings 
                  both professional excellence and spiritual understanding to every project.
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border-l-4 border-amber-500">
                <h4 className="text-xl font-bold text-indigo-800 mb-4">Unique Combination:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>• Cybersecurity & IT expertise</li>
                  <li>• Professional saxophone performance</li>
                  <li>• Deep understanding of church culture</li>
                  <li>• Experience with audio/visual systems</li>
                  <li>• Passion for spiritual ministry</li>
                  <li>• Community-focused approach</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Service Packages */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Service Options</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Technology Services */}
            <div className="bg-white/90 rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-indigo-800 mb-6 text-center">Church Technology Services</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Audio System Consultation</span>
                  <span className="font-semibold text-indigo-800">Starting at $500</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Live Streaming Setup</span>
                  <span className="font-semibold text-indigo-800">Starting at $1,500</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Complete A/V Installation</span>
                  <span className="font-semibold text-indigo-800">Custom Quote</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-700">Digital Ministry Platform</span>
                  <span className="font-semibold text-indigo-800">Starting at $2,000</span>
                </div>
              </div>
            </div>

            {/* Music Services */}
            <div className="bg-white/90 rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-indigo-800 mb-6 text-center">Gospel Saxophone Programs</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Individual Lessons (per hour)</span>
                  <span className="font-semibold text-indigo-800">$75</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Monthly Program (4 lessons)</span>
                  <span className="font-semibold text-indigo-800">$280</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Church Musician Workshop</span>
                  <span className="font-semibold text-indigo-800">$200/person</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-700">Recording Session (per song)</span>
                  <span className="font-semibold text-indigo-800">$300</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="mb-16 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-3xl p-10 shadow-lg border-l-4 border-amber-500">
          <div className="text-center">
            <p className="text-xl text-gray-700 italic mb-6">
              "Dr. Pierce transformed our worship experience. Our new sound system sounds amazing, our live stream reaches hundreds of families, 
              and his saxophone playing during worship moves people to tears. He understands both the technical side and the spiritual heart of what we do."
            </p>
            <p className="font-semibold text-indigo-800">— Pastor Williams, Mount Olive Baptist Church</p>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-indigo-900 font-serif">Enhance Your Ministry Today</h2>
          <p className="text-xl text-gray-700 mb-8">Whether you need better church technology or want to develop your musical gifts, we're here to serve your ministry.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="px-10 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-semibold text-lg rounded-full hover:from-amber-600 hover:to-yellow-500 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Schedule Ministry Consultation
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

export default ChurchTech;