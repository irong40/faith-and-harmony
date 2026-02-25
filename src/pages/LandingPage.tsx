import { Link } from "react-router-dom";
import "./landing.css";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <div className="lp-scanline-overlay" />
      <div className="lp-scanline-bar" />
      <div className="lp-grid-bg" />

      {/* Header */}
      <header className="lp-header">
        <div className="lp-container">
          <div className="lp-header-content">
            <div className="lp-logo-section">
              <img src="/assets/landing/sentinel-logo.png" alt="Sentinel Aerial Inspections Logo" />
              <div className="lp-logo-text">
                <h1>SENTINEL AERIAL INSPECTIONS</h1>
                <p className="lp-subtitle">Faith &amp; Harmony LLC</p>
              </div>
            </div>
            <div className="lp-header-right">
              <Link to="/auth" className="lp-login-link">Pilot Login</Link>
              <div className="lp-veteran-badge">100% VETERAN OWNED</div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-container">
          <h2>PROFESSIONAL DRONE SERVICES<span>HAMPTON ROADS</span></h2>
          <p>AERIAL PHOTOGRAPHY / INSPECTIONS / 3D PHOTOGRAMMETRY FOR REAL ESTATE PROFESSIONALS, CONTRACTORS, AND COMMERCIAL CLIENTS / CONSISTENT QUALITY / FAST TURNAROUND / COMPLEX AIRSPACE EXPERTISE</p>
          <a href="#portfolio" className="lp-cta-button">VIEW OUR WORK</a>
        </div>
      </section>

      {/* Services */}
      <section className="lp-services">
        <div className="lp-container">
          <h2 className="lp-section-title">OUR SERVICES</h2>
          <div className="lp-services-grid">
            <div className="lp-service-card">
              <h3>AERIAL PHOTOGRAPHY</h3>
              <p>High resolution aerial photos for real estate listings, commercial properties, and marketing materials. Perfect for showcasing properties from unique perspectives that ground photography cannot capture.</p>
            </div>
            <div className="lp-service-card">
              <h3>PROPERTY INSPECTIONS</h3>
              <p>Detailed roof and structure inspections using enterprise grade equipment. Thermal imaging available for identifying moisture intrusion, insulation gaps, and electrical hotspots.</p>
            </div>
            <div className="lp-service-card">
              <h3>3D PHOTOGRAMMETRY</h3>
              <p>Construction progress monitoring, site surveys, and volumetric analysis. Survey grade accuracy with RTK positioning for engineering and development projects.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Equipment */}
      <section className="lp-equipment">
        <div className="lp-container">
          <h2 className="lp-section-title">ENTERPRISE EQUIPMENT</h2>
          <div className="lp-equipment-grid">
            {/* Replace these images with actual Matrice 4E photos */}
            <div className="lp-equipment-item">
              <img src="/assets/landing/matrice-4e.png" alt="DJI Matrice 4E Enterprise Drone" />
              <div className="lp-equipment-caption">
                <h3>DJI MATRICE 4E</h3>
                <p>MECHANICAL SHUTTER / RTK POSITIONING / 49 MIN ENDURANCE / SURVEY GRADE ACCURACY</p>
              </div>
            </div>
            <div className="lp-equipment-item">
              <img src="/assets/landing/hero-banner.jpg" alt="DJI Matrice 4 Fleet" />
              <div className="lp-equipment-caption">
                <h3>DUAL AIRCRAFT FLEET</h3>
                <p>ZERO DOWNTIME / ENTERPRISE BACKUP / MISSION REDUNDANCY / PROFESSIONAL RELIABILITY</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="lp-portfolio" id="portfolio">
        <div className="lp-container">
          <div className="lp-portfolio-content">
            <h2 className="lp-section-title">PORTFOLIO</h2>
            <p>EXPLORE OUR AERIAL PHOTOGRAPHY WORK SHOWCASING RESIDENTIAL LISTINGS / COMMERCIAL PROPERTIES / INSPECTION PROJECTS ACROSS HAMPTON ROADS</p>
            <a href="https://sentinelaerial.faithandharmonyllc.com/aerial-photos" className="lp-cta-button" target="_blank" rel="noopener noreferrer">VIEW AERIAL PHOTOS GALLERY</a>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="lp-about">
        <div className="lp-container">
          <div className="lp-about-content">
            <h2 className="lp-section-title">WHY SENTINEL</h2>
            <h3>VETERAN OWNED / TECHNOLOGY DRIVEN / QUALITY GUARANTEED</h3>
            <p>Founded by a former U.S. Army Captain with nine years of active duty experience in Field Artillery and Information Systems Management. We bring military precision to civilian drone operations.</p>
            <p>Hampton Roads has some of the most complex airspace in the country. Norfolk Naval Station. NAS Oceana. Langley Air Force Base. While others avoid these areas, we specialize in them. Our LAANC authorization expertise and military background allow us to operate where competitors cannot.</p>
            <ul className="lp-features-list">
              <li>FAA Part 107 Certified Remote Pilots</li>
              <li>LAANC Authorized for Controlled Airspace</li>
              <li>Enterprise Grade DJI Equipment</li>
              <li>AI Powered Quality Assurance</li>
              <li>$1M Liability Insurance Coverage</li>
              <li>48 Hour Turnaround on Most Projects</li>
              <li>SOC 2 Compliant Data Security</li>
              <li>Veteran Owned Small Business</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Vets to Drones */}
      <section className="lp-vets">
        <div className="lp-container">
          <div className="lp-vets-content">
            <h2>CALLING ALL <span>VETERANS</span></h2>
            <div className="lp-vets-subtitle">YOUR MISSION CONTINUES</div>
            <p>You served with discipline, precision, and honor. Those same skills translate directly into the civilian drone industry. The demand for professional drone pilots is growing faster than the talent pipeline can fill it.</p>
            <p>Commercial drone operations require exactly what the military taught you: attention to detail, risk assessment, mission planning, and execution under pressure. Your clearance background, airspace knowledge, and operational discipline give you a competitive advantage that civilian operators cannot match.</p>

            <div className="lp-vets-grid">
              <div className="lp-vets-card">
                <h3>TRANSFERABLE SKILLS</h3>
                <p>Flight operations, airspace management, tactical planning, risk mitigation, equipment maintenance. You already have the foundation.</p>
              </div>
              <div className="lp-vets-card">
                <h3>VETERAN ADVANTAGES</h3>
                <p>Installation access, VOSB contract set asides, federal grant funding, and credibility with government and commercial clients.</p>
              </div>
              <div className="lp-vets-card">
                <h3>CLEAR PATHWAY</h3>
                <p>FAA Part 107 certification takes 4 to 6 weeks. Equipment investment starts under $1,500. First revenue within 90 days.</p>
              </div>
            </div>

            <div className="lp-vets-cta">
              <p>INTERESTED IN TRANSITIONING TO COMMERCIAL DRONE OPERATIONS?</p>
              <a href="https://home.faithandharmonyllc.com" className="lp-cta-button" target="_blank" rel="noopener noreferrer">LET'S TALK</a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="lp-contact">
        <div className="lp-container">
          <h2 className="lp-section-title">GET STARTED</h2>
          <p className="lp-contact-subtitle">READY TO ELEVATE YOUR PROPERTY MARKETING? CONTACT US FOR A QUOTE.</p>
          <a href="https://www.droneinvoice.com/us/va/chesapeake/pilots/home-faithandharmonyllc-com?pilotReferral=1" className="lp-cta-button" target="_blank" rel="noopener noreferrer" style={{ marginBottom: 50 }}>BOOK A FLIGHT</a>
          <div className="lp-contact-info">
            <div className="lp-contact-item">
              <h4>PHONE</h4>
              <p><a href="tel:7605754876">760.575.4876</a></p>
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

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container">
          <p>&copy; 2026 SENTINEL AERIAL INSPECTIONS | FAITH &amp; HARMONY LLC | ALL RIGHTS RESERVED</p>
          <p style={{ marginTop: 10 }}>LICENSED &amp; INSURED | FAA PART 107 CERTIFIED | VETERAN OWNED SMALL BUSINESS</p>
        </div>
      </footer>
    </div>
  );
}
