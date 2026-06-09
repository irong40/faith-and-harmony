import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import RequestQuoteForm from "@/components/landing/RequestQuoteForm";
import "./landing.css";

/**
 * Standalone /quote route — the shareable, attribution-tracked lead surface.
 * Renders the same RequestQuoteForm embedded in the landing #contact section.
 */
export default function RequestQuote() {
  return (
    <div className="fh-landing">
      <Helmet>
        <title>Request a Quote — Sentinel Aerial Inspections</title>
        <meta
          name="description"
          content="Tell us about your drone job and we'll send a scoped proposal — pricing, deliverables, and a flight plan — within one business day."
        />
      </Helmet>

      <section className="fh-section fh-section-darker fh-section--centered">
        <div className="fh-container">
          <h1 className="fh-section-title">Request a Quote</h1>
          <div className="fh-title-bar" />
          <p className="fh-section-subtitle">
            Tell us about the job. We'll send a scoped proposal — pricing, deliverables, and a
            flight plan — within one business day.
          </p>
          <RequestQuoteForm />
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link to="/" className="fh-btn fh-btn-outline">← Back to home</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
