import { Link } from "react-router-dom";
import CapabilitiesHelmet from "@/components/seo/CapabilitiesHelmet";
import "./landing.css";
import "./capabilities.css";

const CAPABILITY_DOC = "/sentinel-aerial-capability-statement.docx";

interface IdRow {
  term: string;
  value: React.ReactNode;
}

const IDENTIFICATION: IdRow[] = [
  { term: "Legal Entity", value: "Faith & Harmony LLC (DBA Sentinel Aerial Inspections)" },
  { term: "SAM.gov UEI", value: "JBPVN2EFN6S7" },
  { term: "CAGE Code", value: "20CX8 (active · renewal 2027-05-06)" },
  { term: "VA SCC Entity ID", value: "11851533" },
  { term: "Business Size", value: "Small Business · Veteran-Owned" },
  { term: "SDVOSB", value: <strong>Pursuit in progress (not yet certified)</strong> },
  { term: "NAICS Codes", value: "541370 · 541990 · 561621" },
  { term: "eVA (Virginia)", value: "Active" },
  { term: "Headquarters", value: "4221 Quailshire Ct, Chesapeake, VA 23321" },
  {
    term: "Phone",
    value: (
      <>
        <a href="tel:7578438772">757.843.8772</a> (office) {"·"}{" "}
        <a href="tel:7605754876">760.575.4876</a> (PI mobile)
      </>
    ),
  },
  {
    term: "Email",
    value: (
      <a href="mailto:draopierce@faithandharmonyllc.com">draopierce@faithandharmonyllc.com</a>
    ),
  },
  {
    term: "Website",
    value: (
      <a href="https://faithandharmonyllc.com" target="_blank" rel="noopener noreferrer">
        faithandharmonyllc.com
      </a>
    ),
  },
];

export default function Capabilities() {
  const handlePrint = () => window.print();

  return (
    <div className="fh-landing fh-cap">
      <a href="#cap-content" className="fh-skip-link">Skip to content</a>
      <CapabilitiesHelmet />

      {/* Nav — matches LandingPage public nav */}
      <nav className="fh-nav fh-cap-noprint">
        <div className="fh-container fh-nav-inner">
          <Link to="/" className="fh-nav-brand" style={{ textDecoration: "none" }}>
            <span className="fh-nav-logo">Faith & Harmony</span>
            <span className="fh-nav-llc">LLC</span>
          </Link>
          <div className="fh-nav-links">
            <Link to="/#services">Services</Link>
            <Link to="/capabilities">Capabilities</Link>
            <Link to="/#contact">Contact</Link>
            <span className="fh-nav-phone">757.843.8772</span>
            <Link to="/auth" className="fh-nav-login">Client Portal</Link>
          </div>
        </div>
      </nav>

      {/* Masthead */}
      <header className="fh-cap-masthead" id="cap-content">
        <div className="fh-hero-glow" />
        <div className="fh-container">
          <p className="fh-cap-eyebrow">Capability Statement</p>
          <h1 className="fh-cap-title">Sentinel Aerial Inspections</h1>
          <p className="fh-cap-tagline">
            Veteran-owned aerial intelligence — inspections {"·"} wildlife census{" "}
            {"·"} 3D photogrammetry {"·"} federal-ready.
          </p>
          <div className="fh-cap-actions">
            <a href={CAPABILITY_DOC} className="fh-btn fh-btn-primary" download>
              Download Capability Statement
            </a>
            <button type="button" onClick={handlePrint} className="fh-btn fh-btn-outline">
              Print / Save as PDF
            </button>
          </div>
        </div>
      </header>

      {/* Document body */}
      <main className="fh-cap-body">
        <div className="fh-container">

          {/* Company Identification */}
          <section className="fh-cap-block">
            <h2 className="fh-cap-block-title">Company Identification</h2>
            <div className="fh-title-bar" />
            <div className="fh-cap-idgrid">
              {IDENTIFICATION.map((row) => (
                <div key={row.term} className="fh-cap-idrow">
                  <span className="fh-cap-idterm">{row.term}</span>
                  <span className="fh-cap-iddef">{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Core Capabilities */}
          <section className="fh-cap-block">
            <h2 className="fh-cap-block-title">Core Capabilities</h2>
            <div className="fh-title-bar" />
            <div className="fh-cap-cards">
              <div className="fh-cap-card">
                <h3>Aerial Imaging &amp; Mapping</h3>
                <p>
                  2D orthomosaics (1.2–1.5 cm/px GSD); 3D photogrammetry with CesiumJS
                  delivery; construction progress documentation; commercial real estate
                  marketing.
                </p>
              </div>
              <div className="fh-cap-card">
                <h3>AI-Powered Wildlife Census</h3>
                <p>
                  YOLOv8 thermal detection (mAP 0.978); M4T + Manifold 3 on-device
                  inference; state DWR &amp; private-acre surveys; Herd Mapper adaptive
                  two-pass system.
                </p>
              </div>
              <div className="fh-cap-card">
                <h3>Federal-Grade Operations</h3>
                <p>
                  CISSP / CISA / FAA Part 107 principal; NIST RMF &amp; FISMA literate;
                  NASA Langley + Newport News Shipbuilding history; CMMC L2-aligned data
                  handling.
                </p>
              </div>
            </div>
          </section>

          {/* Differentiators */}
          <section className="fh-cap-block">
            <h2 className="fh-cap-block-title">Differentiators</h2>
            <div className="fh-title-bar" />
            <ul className="fh-cap-list">
              <li>
                <strong>On-device AI thermal detection</strong> — YOLOv8 at mAP 0.978;
                runs at the edge on Jetson Orin NX.
              </li>
              <li>
                <strong>Veteran-owned principal</strong> with 20+ years DoD/federal
                cybersecurity (CISSP, CISA, doctorate in Information Systems Management).
              </li>
              <li>
                <strong>Hampton Roads airspace fluency</strong> — Class B/restricted ops
                at NAS Norfolk, NAS Oceana, Langley AFB.
              </li>
              <li>
                <strong>Federal data-handling posture</strong> — TLS 1.3 + AES-256, RBAC,
                audit trails, CMMC L2-aligned.
              </li>
            </ul>
          </section>

          {/* Past Performance */}
          <section className="fh-cap-block">
            <h2 className="fh-cap-block-title">Past Performance</h2>
            <div className="fh-title-bar" />
            <ul className="fh-cap-list">
              <li>
                <span className="fh-cap-list-label">Job 4C913C</span> — Two-property
                commercial warehouse imagery, Chesapeake + Norfolk VA (Droners.io,
                2026-04-20).
              </li>
              <li>
                <span className="fh-cap-list-label">Job C7E3FD</span> — Cemetery
                orthomosaic survey, Hampton VA; downstream to chronicle.rip platform
                (2026-04-07).
              </li>
              <li>
                <span className="fh-cap-list-label">Federal IT</span> — NASA Langley
                vulnerability management (Tyton LLC), 200+ systems, NIST/FISMA
                (2024–2025).
              </li>
              <li>
                <span className="fh-cap-list-label">Federal IT</span> — Newport News
                Shipbuilding, Lead ISSO, 9 classified networks, zero incidents
                (2019–2024).
              </li>
            </ul>
          </section>

          {/* Teaming & Network */}
          <section className="fh-cap-block">
            <h2 className="fh-cap-block-title">Teaming &amp; Network</h2>
            <div className="fh-title-bar" />
            <ul className="fh-cap-list">
              <li>
                <strong>Beaufort County Community College (NC)</strong> — GIS/mapping
                student-labor pipeline.
              </li>
              <li>
                <strong>Elizabeth City State University (HBCU, UNC system)</strong> —
                academic partner for federal proposals.
              </li>
              <li>
                <strong>Vets to Drones (V2D)</strong> — veteran 1099 pilot/research-engineer
                network.
              </li>
            </ul>
          </section>

          <p className="fh-cap-footnote">
            Faith &amp; Harmony LLC (DBA Sentinel Aerial Inspections) {"·"} 4221
            Quailshire Ct, Chesapeake, VA 23321 {"·"} SAM.gov UEI JBPVN2EFN6S7{" "}
            {"·"} CAGE 20CX8 {"·"} draopierce@faithandharmonyllc.com {"·"}{" "}
            faithandharmonyllc.com
          </p>
        </div>
      </main>

      {/* Footer — matches LandingPage public footer */}
      <footer className="fh-footer fh-cap-noprint">
        <div className="fh-container fh-footer-inner">
          <div>
            <div className="fh-footer-brand">Faith &amp; Harmony LLC</div>
            <p className="fh-footer-sub">Hampton Roads, Virginia</p>
            <div className="fh-footer-links">
              <Link to="/capabilities">Government Contracting</Link>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
          <div className="fh-footer-right">
            <p><a href="tel:7578438772">757.843.8772</a></p>
            <p><a href="mailto:draopierce@faithandharmonyllc.com">draopierce@faithandharmonyllc.com</a></p>
            <p>&copy; {new Date().getFullYear()} Faith &amp; Harmony LLC</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
