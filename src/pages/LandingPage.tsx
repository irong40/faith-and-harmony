import { Link } from "react-router-dom";
import LandingPageHelmet from "@/components/seo/LandingPageHelmet";
import LandingPageJsonLd from "@/components/seo/LandingPageJsonLd";
import QuoteForm from "@/components/landing/QuoteForm";
import "./landing.css";

export default function LandingPage() {
  return (
    <div className="fh-landing">
      <LandingPageHelmet />
      <LandingPageJsonLd />

      {/* Nav */}
      <nav className="fh-nav">
        <div className="fh-container fh-nav-inner">
          <div className="fh-nav-brand">
            <span className="fh-nav-logo">Faith &amp; Harmony</span>
            <span className="fh-nav-llc">LLC</span>
          </div>
          <div className="fh-nav-links">
            <a href="#services">Services</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <span className="fh-nav-phone">757.843.8772</span>
            <a href="https://trestle.sentinelaerialinspections.com/auth" className="fh-nav-login">Pilot Portal</a>
            <Link to="/auth" className="fh-nav-login">Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="fh-hero">
        <div className="fh-hero-glow" />
        <div className="fh-container fh-hero-content">
          <h1 className="fh-hero-title">
            Faith &amp; Harmony
            <br />
            <span className="fh-hero-accent">LLC</span>
          </h1>
          <p className="fh-hero-subtitle">Veteran-Owned Professional Services</p>
          <p className="fh-hero-desc">
            Technology-driven solutions for real estate, construction, and property
            management — headquartered in Hampton Roads, Virginia.
          </p>
          <div className="fh-hero-actions">
            <a href="#contact" className="fh-btn fh-btn-primary">Get Started</a>
            <a href="tel:7578438772" className="fh-btn fh-btn-outline">757.843.8772</a>
          </div>
        </div>
        <div className="fh-divider" />
      </header>

      {/* Trust Bar */}
      <section className="fh-trust">
        <div className="fh-container fh-trust-inner">
          {["Veteran Owned", "FAA Part 107", "$1M Insurance", "Hampton Roads VA"].map((b) => (
            <span key={b} className="fh-trust-badge">{b}</span>
          ))}
        </div>
      </section>

      {/* Divisions */}
      <section id="services" className="fh-section fh-section-dark">
        <div className="fh-container">
          <h2 className="fh-section-title">Our Divisions</h2>
          <div className="fh-title-bar" />
          <div className="fh-cards-grid">
            <div className="fh-card fh-card-featured">
              <div className="fh-card-badge">Flagship</div>
              <h3 className="fh-card-title">Sentinel Aerial Inspections</h3>
              <p className="fh-card-desc">
                Professional drone services for real estate, construction, and property
                inspection. Aerial photography, orthomosaic mapping, thermal imaging, and
                construction progress monitoring with enterprise-grade equipment.
              </p>
              <ul className="fh-card-list">
                <li>Aerial Photography &amp; Video</li>
                <li>Roof &amp; Property Inspections</li>
                <li>Orthomosaic Mapping &amp; 3D Models</li>
                <li>Construction Progress Documentation</li>
                <li>Thermal Imaging &amp; Analysis</li>
              </ul>
              <a
                href="https://sentinelaerialinspections.com"
                target="_blank"
                rel="noopener noreferrer"
                className="fh-btn fh-btn-primary"
              >
                Visit Sentinel Aerial
              </a>
            </div>
            <div className="fh-card">
              <h3 className="fh-card-title">Technology Services</h3>
              <p className="fh-card-desc">
                Custom software development, workflow automation, and AI-powered business
                tools. We build the systems that run our own operations — and yours.
              </p>
              <ul className="fh-card-list">
                <li>Business Process Automation</li>
                <li>AI Workflow Integration</li>
                <li>Custom Web Applications</li>
              </ul>
              <a href="#contact" className="fh-btn fh-btn-outline-gold">Inquire</a>
            </div>
            <div className="fh-card">
              <h3 className="fh-card-title">Consulting</h3>
              <p className="fh-card-desc">
                Drone program development, Part 107 compliance guidance, and
                operational consulting for businesses entering the UAS industry.
              </p>
              <ul className="fh-card-list">
                <li>Drone Program Setup</li>
                <li>Part 107 Compliance</li>
                <li>Operational Workflows</li>
              </ul>
              <a href="#contact" className="fh-btn fh-btn-outline-gold">Inquire</a>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="fh-section fh-section-darker">
        <div className="fh-container">
          <h2 className="fh-section-title">About</h2>
          <div className="fh-title-bar" />
          <div className="fh-about-grid">
            <div className="fh-about-text">
              <p>
                Faith &amp; Harmony LLC is a veteran-owned company based in Hampton Roads,
                Virginia. Founded by Adam Pierce, a U.S. military veteran, we bring
                discipline, precision, and integrity to everything we do.
              </p>
              <p>
                Our flagship division, Sentinel Aerial Inspections, provides professional
                drone services across coastal Virginia and northeast North Carolina. We
                operate enterprise-grade equipment including the DJI Matrice 4E, Mavic 3
                Enterprise, and Mini 4 Pro — delivering data our clients can act on.
              </p>
              <p>
                Every project benefits from our in-house technology stack: automated
                processing pipelines, AI-assisted quality control, and a client portal
                built for transparency.
              </p>
            </div>
            <div className="fh-about-stats">
              {[
                { value: "3", label: "Enterprise Drones" },
                { value: "HR", label: "Hampton Roads Based" },
                { value: "24h", label: "Standard Turnaround" },
                { value: "100%", label: "Veteran Owned" },
              ].map((s) => (
                <div key={s.label} className="fh-stat">
                  <div className="fh-stat-value">{s.value}</div>
                  <div className="fh-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Service Area */}
      <section className="fh-section fh-section-dark">
        <div className="fh-container" style={{ textAlign: "center" }}>
          <h2 className="fh-section-title">Service Area</h2>
          <div className="fh-title-bar" />
          <p className="fh-section-subtitle">
            Based in Hampton Roads, Virginia. Serving the entire coastal Virginia region.
          </p>
          <div className="fh-cities">
            {[
              "Norfolk", "Virginia Beach", "Chesapeake", "Hampton",
              "Newport News", "Suffolk", "Portsmouth", "Williamsburg",
              "Outer Banks", "Richmond",
            ].map((c) => (
              <span key={c} className="fh-city">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="fh-section fh-section-darker">
        <div className="fh-container">
          <h2 className="fh-section-title">Get in Touch</h2>
          <div className="fh-title-bar" />
          <p className="fh-section-subtitle">
            Tell us about your project and we'll get back to you within one business day.
          </p>
          <QuoteForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="fh-footer">
        <div className="fh-container fh-footer-inner">
          <div>
            <div className="fh-footer-brand">Faith &amp; Harmony LLC</div>
            <p className="fh-footer-sub">Hampton Roads, Virginia</p>
          </div>
          <div className="fh-footer-right">
            <p><a href="tel:7578438772">757.843.8772</a></p>
            <p><a href="mailto:info@faithandharmonyllc.com">info@faithandharmonyllc.com</a></p>
            <p>&copy; {new Date().getFullYear()} Faith &amp; Harmony LLC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
