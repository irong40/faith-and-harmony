import { Link } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";

const ChurchTech = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="max-w-6xl mx-auto px-8">
        {/* Navigation */}
        <nav className="py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoIcon} alt="Faith & Harmony" className="w-10 h-10" />
            <span className="font-display font-bold text-xl text-primary">Faith & Harmony</span>
          </Link>
          <Link to="/services" className="text-primary hover:text-accent font-semibold transition-colors">
            ← Back to Services
          </Link>
        </nav>

        {/* Hero Section */}
        <section className="py-16 text-center">
          <div className="text-6xl mb-6">🎷</div>
          <h1 className="text-5xl font-bold mb-6 text-primary font-display">
            Church Tech & Gospel Saxophone Programs
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            Enhance your worship experience through professional audio/visual solutions and gospel saxophone instruction.
          </p>
          <div className="inline-block bg-accent/20 border border-accent rounded-full px-6 py-3">
            <span className="text-accent font-bold text-lg">Starting at $199</span>
          </div>
        </section>

        {/* Church Tech */}
        <section className="mb-16 bg-card rounded-3xl p-10 shadow-xl border border-border">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Church Technology Services</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Sound System Consulting</h3>
                <p className="text-card-foreground">Optimize your sanctuary's audio for clear, impactful worship experiences.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Livestream Setup</h3>
                <p className="text-card-foreground">Professional streaming solutions to reach your congregation online.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Recording Services</h3>
                <p className="text-card-foreground">Capture sermons, special services, and musical performances.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary mb-3">Audio Team Training</h3>
                <p className="text-card-foreground">Equip your volunteers with the skills to manage your systems effectively.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Gospel Saxophone */}
        <section className="mb-16 bg-card rounded-3xl p-10 shadow-xl border border-border">
          <h2 className="text-4xl font-bold mb-8 text-primary text-center font-display">Gospel Saxophone Instruction</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-3">Beginner Lessons</h3>
              <p className="text-card-foreground">Learn the fundamentals of saxophone with a focus on gospel music styles.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary mb-3">Intermediate Training</h3>
              <p className="text-card-foreground">Develop your skills in improvisation, worship leading, and ensemble playing.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary mb-3">Advanced Coaching</h3>
              <p className="text-card-foreground">Refine your technique and develop your unique voice as a gospel saxophonist.</p>
            </div>
          </div>
          <div className="mt-8 p-6 bg-accent/10 rounded-xl border border-accent/20">
            <p className="text-center text-card-foreground">
              <strong>Available for:</strong> Tenor and Alto Saxophone | In-person, Online, or Hybrid sessions
            </p>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="mb-16 bg-primary rounded-3xl p-10 shadow-2xl">
          <h2 className="text-4xl font-bold mb-8 text-center font-display text-primary-foreground">Why Faith & Harmony?</h2>
          <div className="grid md:grid-cols-2 gap-8 text-secondary">
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Ministry Understanding</h3>
              <p className="mb-6 opacity-90">We understand that church tech isn't just about equipment—it's about facilitating worship.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">Practical Experience</h3>
              <p className="opacity-90">Years of hands-on experience in church audio, video, and music ministry.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-accent">Gospel Music Heritage</h3>
              <p className="mb-6 opacity-90">Deep roots in gospel music tradition with modern technical expertise.</p>
              <h3 className="text-xl font-bold mb-4 text-accent">Flexible Options</h3>
              <p className="opacity-90">Services tailored to your church's size, budget, and specific needs.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mb-20 text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary font-display">Ready to Enhance Your Worship?</h2>
          <p className="text-xl text-muted-foreground mb-8">Let's discuss how we can support your church's tech needs or start your saxophone journey.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              to="/request-service?service=CHURCH_TECH" 
              className="px-10 py-4 bg-gradient-to-r from-accent to-amber-400 text-primary font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Request This Service
            </Link>
            <Link to="/services" className="px-10 py-4 bg-primary text-primary-foreground font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              View All Services
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ChurchTech;
