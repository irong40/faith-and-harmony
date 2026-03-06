import { Link } from "react-router-dom";
import "./landing.css";

const projects = [
  {
    name: "Faith & Harmony LLC",
    url: "https://faithandharmonyllc.com",
    description: "Parent company and business operations hub",
  },
  {
    name: "Sentinel Aerial Inspections",
    url: "https://sentinelaerialinspections.com",
    description: "Commercial drone services and aerial photography",
  },
  {
    name: "Trestle Pilot Portal",
    url: "https://trestle.sentinelaerialinspections.com",
    description: "Field operations command center for pilots",
  },
  {
    name: "Faith and Love Services",
    url: "https://faithandloveservices.com",
    description: "Community and family services",
  },
  {
    name: "ImpressiveJB",
    url: "https://impressivejb.faithandharmonyllc.com",
    description: "E-commerce storefront",
  },
  {
    name: "Harvest Distribution",
    url: "https://www.harvestdistribution.net",
    description: "B2B wholesale hemp and CBD distribution",
  },
  {
    name: "Dr. Adam O. Pierce Locator",
    url: "https://locator.dradamopierce.com",
    description: "Provider and location finder",
  },
  {
    name: "Healing Hearts Foundation",
    url: "https://healingheartsfoundation.faithandharmonyllc.com",
    description: "Community outreach and support foundation",
  },
];

export default function Projects() {
  return (
    <div className="fh-landing">
      <nav className="fh-nav">
        <div className="fh-container fh-nav-inner">
          <div className="fh-nav-brand">
            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="fh-nav-logo">Faith &amp; Harmony</span>
              <span className="fh-nav-llc">LLC</span>
            </Link>
          </div>
        </div>
      </nav>

      <section className="fh-section fh-section-darker" style={{ paddingTop: "8rem" }}>
        <div className="fh-container">
          <h2 className="fh-section-title">Live Projects</h2>
          <div className="fh-title-bar" />
          <p className="fh-section-subtitle">
            Active applications and websites built and maintained by Faith &amp; Harmony LLC.
          </p>
          <div className="fh-grid" style={{ marginTop: "2rem" }}>
            {projects.map((project) => (
              <a
                key={project.url}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="fh-card"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <h3 className="fh-card-title">{project.name}</h3>
                <p style={{ color: "var(--fh-muted)", marginBottom: "1rem" }}>
                  {project.description}
                </p>
                <span className="fh-btn fh-btn-outline-gold" style={{ display: "inline-block" }}>
                  Visit Site
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

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
