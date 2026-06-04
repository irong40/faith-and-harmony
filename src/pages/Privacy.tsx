import { Link } from "react-router-dom";
import "./landing.css";

export default function Privacy() {
  return (
    <div className="fh-landing">
      <nav className="fh-nav">
        <div className="fh-container fh-nav-inner">
          <Link to="/" className="fh-nav-brand" style={{ textDecoration: "none" }}>
            <span className="fh-nav-logo">Faith &amp; Harmony</span>
            <span className="fh-nav-llc">LLC</span>
          </Link>
          <div className="fh-nav-links">
            <Link to="/" className="fh-nav-login">Back to Home</Link>
          </div>
        </div>
      </nav>

      <section className="fh-section" style={{ paddingTop: "140px" }}>
        <div className="fh-container fh-legal">
          <h1 className="fh-section-title">Privacy Policy</h1>
          <div className="fh-title-bar" />
          <p className="fh-legal-meta">Last updated June 4, 2026</p>

          <p className="fh-legal-intro">
            Faith and Harmony LLC, doing business as Sentinel Aerial Inspections,
            respects your privacy. This policy explains what information we collect,
            how we use it, and the choices you have.
          </p>

          <h2>Information We Collect</h2>
          <p>We collect information that you give us and information we gather automatically.</p>
          <ul>
            <li>Contact details you submit through our quote and contact forms, including your name, email address, and phone number.</li>
            <li>Property and project details you provide so we can scope and deliver our services.</li>
            <li>Aerial imagery, video, and mapping data we capture for the projects you authorize.</li>
            <li>Payment information processed through our payment provider. We do not store full card numbers on our servers.</li>
            <li>Usage data such as pages visited and device information, collected through cookies and analytics.</li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use your information to respond to quote requests, schedule and perform work, deliver finished imagery and reports, process payments, and keep you informed about your project. We also use aggregated usage data to improve our website and services.</p>

          <h2>Aerial Imagery and Property Data</h2>
          <p>We capture imagery only for properties and projects you authorize. We store project deliverables so you can access them through your client portal. We do not sell your imagery or property data. We may use selected images in our portfolio or marketing only when you have given us permission.</p>

          <h2>How We Share Information</h2>
          <p>We share information only with service providers that help us operate, such as our hosting, email, payment, and scheduling vendors. These providers may access information only to perform work for us. We may disclose information when the law requires it or to protect our rights and safety. We never sell your personal information.</p>

          <h2>Cookies and Analytics</h2>
          <p>We use cookies and analytics tools to understand how visitors use our site. You can control cookies through your browser settings. Disabling cookies may affect how some parts of the site work.</p>

          <h2>Data Security</h2>
          <p>We use reasonable technical and organizational measures to protect your information. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.</p>

          <h2>Data Retention</h2>
          <p>We keep your information for as long as needed to provide our services, meet legal and accounting requirements, and resolve disputes. You can ask us to delete information that we are not required to keep.</p>

          <h2>Your Rights</h2>
          <p>You can ask us to access, correct, or delete the personal information we hold about you. Contact us using the details below and we will respond within a reasonable time.</p>

          <h2>Children</h2>
          <p>Our services are not directed to children under 13, and we do not knowingly collect information from them.</p>

          <h2>Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will post the new version here and update the date above.</p>

          <h2>Contact Us</h2>
          <p>
            Questions about this policy can go to{" "}
            <a href="mailto:info@faithandharmonyllc.com">info@faithandharmonyllc.com</a>{" "}
            or 757.843.8772.
          </p>

          <div className="fh-legal-note">
            This page describes our general practices and is provided for information
            only. It is not legal advice. We recommend you have qualified counsel review
            this policy before relying on it.
          </div>
        </div>
      </section>

      <footer className="fh-footer">
        <div className="fh-container fh-footer-inner">
          <div>
            <div className="fh-footer-brand">Faith &amp; Harmony LLC</div>
            <p className="fh-footer-sub">Hampton Roads, Virginia</p>
            <div className="fh-footer-links">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
          </div>
          <div className="fh-footer-right">
            <p><a href="tel:7578438772">757.843.8772</a></p>
            <p><a href="mailto:info@faithandharmonyllc.com">info@faithandharmonyllc.com</a></p>
            <p>&copy; {new Date().getFullYear()} Faith &amp; Harmony LLC</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
