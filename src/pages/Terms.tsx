import { Link } from "react-router-dom";
import "./landing.css";

export default function Terms() {
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
          <h1 className="fh-section-title">Terms of Service</h1>
          <div className="fh-title-bar" />
          <p className="fh-legal-meta">Last updated June 4, 2026</p>

          <p className="fh-legal-intro">
            These terms govern your use of this website and the services provided by
            Faith and Harmony LLC, doing business as Sentinel Aerial Inspections. By
            using our site or hiring us, you agree to these terms.
          </p>

          <h2>Our Services</h2>
          <p>We provide aerial photography, drone mapping, photogrammetry, and property inspection services across coastal Virginia, Maryland, and northeastern North Carolina. The specific scope of any engagement is set out in the quote or proposal we agree on with you.</p>

          <h2>Quotes and Estimates</h2>
          <p>Quotes describe the work, the deliverables, and the price for a defined scope. Quotes remain valid for the period stated in the quote. Work that falls outside the agreed scope may change the price, and we will tell you before we proceed.</p>

          <h2>Payment</h2>
          <p>We process payments through our payment provider. Some projects require a deposit before we schedule the flight, with the balance due on or before delivery. Invoices are payable by the date shown on the invoice.</p>

          <h2>Scheduling, Weather, and Airspace</h2>
          <p>We operate under FAA Part 107 rules. Weather, wind, and temporary flight restrictions can force us to reschedule for safety and legal reasons. We will work with you to find a new time at no extra charge when a flight is delayed for these reasons.</p>

          <h2>Client Responsibilities</h2>
          <p>You confirm that you have the right to authorize flights over and imaging of the property in question. You agree to provide safe site access and any permissions we need from owners, tenants, or managers. You are responsible for the accuracy of the information you give us.</p>

          <h2>Deliverables and License</h2>
          <p>Once you have paid in full, we grant you a license to use the delivered imagery and reports for the purpose described in your quote, such as marketing a listing or documenting a project. Unless we agree otherwise in writing, we retain the right to use selected images in our own portfolio and marketing.</p>

          <h2>Intellectual Property</h2>
          <p>Our website content, software, and processing systems remain our property. You may not copy or reuse them outside the license we grant for your deliverables.</p>

          <h2>Limitation of Liability</h2>
          <p>We deliver our services with professional care. To the extent the law allows, our total liability for any claim related to a project is limited to the amount you paid us for that project. We are not liable for indirect or consequential losses.</p>

          <h2>Insurance</h2>
          <p>We carry commercial drone liability insurance. Proof of coverage is available on request for your project.</p>

          <h2>Governing Law</h2>
          <p>These terms are governed by the laws of the Commonwealth of Virginia, without regard to conflict of law rules.</p>

          <h2>Changes to These Terms</h2>
          <p>We may update these terms from time to time. We will post the new version here and update the date above. Continued use of our site or services means you accept the updated terms.</p>

          <h2>Contact Us</h2>
          <p>
            Questions about these terms can go to{" "}
            <a href="mailto:info@faithandharmonyllc.com">info@faithandharmonyllc.com</a>{" "}
            or 757.843.8772.
          </p>

          <div className="fh-legal-note">
            This page is provided for information only and is not legal advice. We
            recommend you have qualified counsel review these terms before relying on them.
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
