import { Link } from "react-router-dom";

const FinancialCoaching = () => {
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
          <div className="text-6xl mb-6">🌱</div>
          <h1 className="text-5xl font-bold mb-6 text-indigo-900 font-serif">
            Financial Freedom & Land Ownership Coaching
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
            Build generational wealth and secure your family's future through strategic financial planning, land acquisition, and wealth-building education rooted in our community's values.
          </p>
        </section>

        {/* Our Mission */}
        <section className="mb-16 bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Breaking Cycles, Building Legacies</h2>
          <div className="text-center mb-8">
            <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
              For too long, our communities have been excluded from wealth-building opportunities. We're here to change that narrative by providing practical, 
              culturally-aware financial education that helps families build lasting prosperity and pass it down to future generations.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-indigo-800 mb-3">Financial Freedom</h3>
              <p className="text-gray-700">Learn to manage money, eliminate debt, and build multiple income streams.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🏡</div>
              <h3 className="text-xl font-bold text-indigo-800 mb-3">Property Ownership</h3>
              <p className="text-gray-700">Navigate real estate markets and build wealth through strategic property investment.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-xl font-bold text-indigo-800 mb-3">Generational Wealth</h3>
              <p className="text-gray-700">Create systems and structures that benefit your children and grandchildren.</p>
            </div>
          </div>
        </section>

        {/* What We Offer */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Comprehensive Wealth-Building Services</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Personal Financial Planning</h3>
                <p className="text-gray-700 mb-3">Complete financial health assessment and customized roadmap to financial independence.</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Budget creation and debt elimination strategies</li>
                  <li>• Emergency fund building plans</li>
                  <li>• Investment portfolio development</li>
                  <li>• Retirement and education planning</li>
                </ul>
              </div>
              <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Real Estate Investment Guidance</h3>
                <p className="text-gray-700 mb-3">Navigate property markets with confidence and build wealth through strategic real estate ownership.</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• First-time homebuyer education</li>
                  <li>• Investment property analysis</li>
                  <li>• Land acquisition strategies</li>
                  <li>• Property management guidance</li>
                </ul>
              </div>
              <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Business Development Support</h3>
                <p className="text-gray-700 mb-3">Start and grow businesses that generate income and create wealth for your family.</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Business plan development</li>
                  <li>• Funding and financing strategies</li>
                  <li>• Tax optimization planning</li>
                  <li>• Scaling and exit strategies</li>
                </ul>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Estate Planning & Legacy Building</h3>
                <p className="text-gray-700 mb-3">Protect and transfer your wealth to future generations through proper legal structures.</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Will and trust creation guidance</li>
                  <li>• Insurance planning strategies</li>
                  <li>• Tax-efficient wealth transfer</li>
                  <li>• Family financial education</li>
                </ul>
              </div>
              <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Community Investment Programs</h3>
                <p className="text-gray-700 mb-3">Participate in group investment opportunities and community-building financial projects.</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Investment clubs and groups</li>
                  <li>• Community development projects</li>
                  <li>• Cooperative buying programs</li>
                  <li>• Neighborhood improvement initiatives</li>
                </ul>
              </div>
              <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Financial Education Workshops</h3>
                <p className="text-gray-700 mb-3">Group learning sessions covering essential financial literacy topics for individuals and families.</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Money management fundamentals</li>
                  <li>• Credit repair and building</li>
                  <li>• Investment basics and strategies</li>
                  <li>• Real estate market education</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why This Matters */}
        <section className="mb-16 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-10 shadow-2xl text-white">
          <h2 className="text-4xl font-bold mb-8 text-center font-serif">Why Financial Freedom Matters to Our Community</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">🔗 Breaking Historical Barriers</h3>
              <p className="mb-6">For generations, systemic barriers have limited our access to wealth-building opportunities. We provide the knowledge and strategies to overcome these obstacles.</p>
              <h3 className="text-xl font-bold mb-4">🏠 Land Ownership Legacy</h3>
              <p>Land ownership has always been a cornerstone of wealth in America. We help families understand how to acquire, maintain, and profit from property ownership.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">👥 Community Strength</h3>
              <p className="mb-6">When individuals become financially stable, entire communities benefit. We're building a network of financially empowered families.</p>
              <h3 className="text-xl font-bold mb-4">📚 Education Empowerment</h3>
              <p>Financial literacy is power. We ensure our clients understand not just what to do, but why certain strategies work and how to adapt them over time.</p>
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Real Transformations</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "The Johnson Family",
                achievement: "Bought First Home & Investment Property",
                story: "Went from renting to owning two properties within 18 months using strategic planning and credit repair.",
                impact: "$150K in equity built"
              },
              {
                name: "Marcus W.",
                achievement: "Eliminated $45K in Debt",
                story: "Used our debt elimination strategy to become debt-free while building a 6-month emergency fund.",
                impact: "$45K debt eliminated"
              },
              {
                name: "Community Investment Group",
                achievement: "Purchased Commercial Property",
                story: "12 families pooled resources to buy a strip mall, creating passive income for all participants.",
                impact: "$2.2M community investment"
              }
            ].map((story, index) => (
              <div key={index} className="bg-white/90 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-indigo-900 mb-2">{story.name}</h3>
                <h4 className="text-md font-semibold text-indigo-700 mb-3">{story.achievement}</h4>
                <p className="text-gray-700 mb-4">{story.story}</p>
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 border-l-4 border-amber-500">
                  <p className="font-semibold text-indigo-800">{story.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Our Approach */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Our Culturally-Aware Approach</h2>
          <div className="bg-white/90 rounded-3xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-indigo-800 mb-4">Understanding Our History</h3>
                <p className="text-gray-700 mb-4">
                  We acknowledge the unique financial challenges faced by Black families due to historical discrimination in lending, 
                  housing, and employment. Our strategies address these realities head-on.
                </p>
                <p className="text-gray-700 mb-4">
                  From redlining to predatory lending, we help clients navigate systems that weren't designed for our success, 
                  while building wealth despite these obstacles.
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-indigo-800 mb-4">Community-Centered Solutions</h3>
                <p className="text-gray-700 mb-4">
                  We believe in collective prosperity. Our programs often focus on group investments, cooperative buying, 
                  and community development projects that benefit everyone involved.
                </p>
                <p className="text-gray-700 mb-4">
                  Financial freedom isn't just an individual goal—it's a community transformation that happens when we 
                  work together and support each other's success.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Coaching Packages */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Coaching Programs</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Foundation Builder",
                price: "$150/month",
                duration: "3-month minimum",
                features: [
                  "Monthly 1-on-1 coaching sessions",
                  "Personalized financial plan",
                  "Debt elimination strategy",
                  "Budget and savings guidance",
                  "Email support between sessions"
                ],
                ideal: "Individuals starting their financial journey"
              },
              {
                name: "Wealth Creator",
                price: "$300/month",
                duration: "6-month minimum",
                features: [
                  "Bi-weekly coaching sessions",
                  "Investment planning and guidance",
                  "Real estate market analysis",
                  "Business development support",
                  "Tax optimization strategies",
                  "Priority phone/email support"
                ],
                ideal: "Families ready to build wealth",
                popular: true
              },
              {
                name: "Legacy Builder",
                price: "$500/month",
                duration: "12-month minimum",
                features: [
                  "Weekly coaching sessions",
                  "Estate planning guidance",
                  "Community investment opportunities",
                  "Family financial education",
                  "Advanced investment strategies",
                  "Direct access to Dr. Pierce"
                ],
                ideal: "High-income earners and business owners"
              }
            ].map((package_, index) => (
              <div key={index} className={`bg-white/90 rounded-2xl p-6 shadow-lg ${package_.popular ? 'ring-2 ring-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50' : ''}`}>
                {package_.popular && (
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-bold text-sm px-3 py-1 rounded-full inline-block mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-indigo-900 mb-2">{package_.name}</h3>
                <div className="mb-4">
                  <p className="text-2xl font-bold text-indigo-800">{package_.price}</p>
                  <p className="text-sm text-gray-600">{package_.duration}</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {package_.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="text-gray-700 text-sm">• {feature}</li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 italic">Ideal for: {package_.ideal}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workshop Options */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold mb-8 text-indigo-900 text-center font-serif">Group Workshops & Events</h2>
          <div className="bg-white/90 rounded-3xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-4">Community Workshops</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Financial Fundamentals (2-hour session)</span>
                    <span className="font-semibold text-indigo-800">$50/person</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">First-Time Homebuyer Workshop (4 hours)</span>
                    <span className="font-semibold text-indigo-800">$100/person</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Investment Basics (Half-day workshop)</span>
                    <span className="font-semibold text-indigo-800">$150/person</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Building Generational Wealth (Full day)</span>
                    <span className="font-semibold text-indigo-800">$250/person</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-800 mb-4">Custom Group Sessions</h3>
                <p className="text-gray-700 mb-4">
                  We offer customized workshops for churches, community organizations, and corporate groups. 
                  Topics can be tailored to your specific needs and audience.
                </p>
                <p className="text-gray-700 mb-4">
                  Group discounts available for 10 or more participants.
                </p>
                <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-full hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300">
                  Request Custom Workshop
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-indigo-900 font-serif">Start Building Your Legacy Today</h2>
          <p className="text-xl text-gray-700 mb-8">Every wealthy family started with someone who decided to break the cycle. Let that someone be you.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="px-10 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-900 font-semibold text-lg rounded-full hover:from-amber-600 hover:to-yellow-500 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Schedule Free Financial Consultation
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

export default FinancialCoaching;