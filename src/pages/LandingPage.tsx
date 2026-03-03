import { Link } from "react-router-dom";
import LandingPageHelmet from "@/components/seo/LandingPageHelmet";
import LandingPageJsonLd from "@/components/seo/LandingPageJsonLd";
import StickyNav from "@/components/landing/StickyNav";
import HeroSection from "@/components/landing/HeroSection";
import TrustBar from "@/components/landing/TrustBar";
import PricingSection from "@/components/landing/PricingSection";
import PortfolioGrid from "@/components/landing/PortfolioGrid";
import MilitaryAirspace from "@/components/landing/MilitaryAirspace";
import FAQSection from "@/components/landing/FAQSection";
import QuoteForm from "@/components/landing/QuoteForm";
import ServiceArea from "@/components/landing/ServiceArea";
import AboutFounder from "@/components/landing/AboutFounder";
import "./landing.css";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <LandingPageHelmet />
      <LandingPageJsonLd />
      <StickyNav />
      <div className="lp-scanline-overlay" />
      <div className="lp-scanline-bar" />
      <div className="lp-grid-bg" />

      {/* Header */}
      <header className="lp-header">
        <div className="lp-container">
          <div className="lp-header-content">
            <div className="lp-logo-section">
              <img
                src="/assets/landing/sentinel-logo.png"
                alt="Sentinel Aerial Inspections Logo"
                width={300}
                height={300}
              />
              <div className="lp-logo-text">
                <div className="lp-logo-heading">SENTINEL AERIAL INSPECTIONS</div>
                <p className="lp-subtitle">Faith &amp; Harmony LLC</p>
              </div>
            </div>
            <div className="lp-header-right">
              <nav aria-label="Site navigation">
                <Link to="/auth" className="lp-login-link">Pilot Login</Link>
              </nav>
              <div className="lp-veteran-badge">100% VETERAN OWNED</div>
            </div>
          </div>
        </div>
      </header>

      <main className="lp-main">
        <HeroSection />
        <TrustBar />

        {/* Services */}
        <section className="lp-services" id="services" aria-label="Services">
          <div className="lp-container">
            <h2 className="lp-section-title">OUR SERVICES</h2>
            <div className="lp-services-grid">
              <div className="lp-service-card">
                <h3>Real Estate Agents</h3>
                <p>You get aerial photos your listings need to stand out. Sentinel delivers edited shots the next business day. Every image goes through automated quality checks before it reaches you.</p>
              </div>
              <div className="lp-service-card">
                <h3>Property Owners</h3>
                <p>Roof and structure inspections without putting anyone on a ladder. You get an annotated report with grid photography you can share with your insurance carrier or contractor.</p>
              </div>
              <div className="lp-service-card">
                <h3>Contractors and Developers</h3>
                <p>Construction progress documentation, orthomosaics, and 3D models from survey grade equipment. Date stamped archives you can use to track changes across the full build cycle.</p>
              </div>
            </div>
          </div>
        </section>

        <PricingSection />

        {/* Equipment */}
        <section className="lp-equipment" aria-label="Equipment">
          <div className="lp-container">
            <h2 className="lp-section-title">ENTERPRISE EQUIPMENT</h2>
            <div className="lp-equipment-grid">
              <div className="lp-equipment-item">
                <img
                  src="/assets/landing/matrice-4e.png"
                  alt="DJI Matrice 4E Enterprise Drone"
                  width={600}
                  height={400}
                  loading="lazy"
                />
                <div className="lp-equipment-caption">
                  <h3>DJI MATRICE 4E</h3>
                  <p>MECHANICAL SHUTTER / RTK POSITIONING / 49 MIN ENDURANCE / SURVEY GRADE ACCURACY</p>
                </div>
              </div>
              <div className="lp-equipment-item">
                <img
                  src="/assets/landing/hero-banner.jpg"
                  alt="DJI Matrice 4 Fleet"
                  width={1920}
                  height={1080}
                  loading="lazy"
                />
                <div className="lp-equipment-caption">
                  <h3>DUAL AIRCRAFT FLEET</h3>
                  <p>ZERO DOWNTIME / ENTERPRISE BACKUP / MISSION REDUNDANCY / PROFESSIONAL RELIABILITY</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PortfolioGrid />
        <MilitaryAirspace />
        <FAQSection />
        <QuoteForm />
        <ServiceArea />
        <AboutFounder />

        {/* Contact */}
        <section className="lp-contact" aria-label="Contact information" id="contact">
          <div className="lp-container">
            <h2 className="lp-section-title">GET IN TOUCH</h2>
            <p className="lp-contact-subtitle">Call or email directly. Response within one business day.</p>
            <div className="lp-contact-info">
              <div className="lp-contact-item">
                <h4>PHONE</h4>
                <p><a href="tel:7578438772">757.843.8772</a></p>
              </div>
              <div className="lp-contact-item">
                <h4>EMAIL</h4>
                <p><a href="mailto:contact@sentinelaerial.com">contact@sentinelaerial.com</a></p>
              </div>
              <div className="lp-contact-item">
                <h4>SERVICE AREA</h4>
                <p>HAMPTON ROADS, VA<br />MARYLAND &amp; NORTHERN NC</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="lp-footer" aria-label="Site footer">
        <div className="lp-container">
          <div className="lp-footer-badges">
            <span className="lp-footer-badge">FAA PART 107 CERTIFIED</span>
            <span className="lp-footer-badge">LICENSED &amp; INSURED</span>
            <span className="lp-footer-badge lp-footer-badge-veteran">VETERAN OWNED SMALL BUSINESS</span>
          </div>
          <p className="lp-footer-copy">&copy; 2026 SENTINEL AERIAL INSPECTIONS | FAITH &amp; HARMONY LLC | ALL RIGHTS RESERVED</p>
        </div>
      </footer>
    </div>
  );
}
