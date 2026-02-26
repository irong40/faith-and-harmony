export default function PricingSection() {
  return (
    <section className="lp-pricing" id="pricing" aria-label="Pricing">
      <div className="lp-container">
        <h2 className="lp-section-title">Pricing</h2>

        <div className="lp-pricing__groups">
          {/* Residential */}
          <div className="lp-pricing__group">
            <h3 className="lp-pricing__group-title">Residential</h3>
            <div className="lp-pricing__cards">
              <div className="lp-pricing__card">
                <div className="lp-pricing__card-header">
                  <span className="lp-pricing__name">Listing Lite</span>
                  <span className="lp-pricing__price">$225</span>
                </div>
                <ul className="lp-pricing__deliverables">
                  <li>10 photos</li>
                  <li>Sky replacement</li>
                  <li>Next day delivery</li>
                </ul>
                <a href="#quote?service=listing-lite" className="lp-cta-button lp-pricing__cta">Get a Quote</a>
              </div>

              <div className="lp-pricing__card">
                <div className="lp-pricing__card-header">
                  <span className="lp-pricing__name">Listing Pro</span>
                  <span className="lp-pricing__price">$450</span>
                </div>
                <ul className="lp-pricing__deliverables">
                  <li>25 photos</li>
                  <li>60 second reel</li>
                  <li>2D boundary overlay</li>
                  <li>48 hour turnaround</li>
                </ul>
                <a href="#quote?service=listing-pro" className="lp-cta-button lp-pricing__cta">Get a Quote</a>
              </div>

              <div className="lp-pricing__card">
                <div className="lp-pricing__card-header">
                  <span className="lp-pricing__name">Luxury Listing</span>
                  <span className="lp-pricing__price">$750</span>
                </div>
                <ul className="lp-pricing__deliverables">
                  <li>40 or more photos</li>
                  <li>2 minute cinematic video</li>
                  <li>Twilight shoot</li>
                  <li>24 hour priority</li>
                </ul>
                <a href="#quote?service=luxury-listing" className="lp-cta-button lp-pricing__cta">Get a Quote</a>
              </div>
            </div>
          </div>

          {/* Commercial */}
          <div className="lp-pricing__group">
            <h3 className="lp-pricing__group-title">Commercial</h3>
            <div className="lp-pricing__cards">
              <div className="lp-pricing__card">
                <div className="lp-pricing__card-header">
                  <span className="lp-pricing__name">Construction Progress</span>
                  <span className="lp-pricing__price">$450 per visit</span>
                </div>
                <ul className="lp-pricing__deliverables">
                  <li>Orthomosaic</li>
                  <li>Site overview</li>
                  <li>Date stamped archive</li>
                </ul>
                <a href="#quote?service=construction-progress" className="lp-cta-button lp-pricing__cta">Get a Quote</a>
              </div>

              <div className="lp-pricing__card">
                <div className="lp-pricing__card-header">
                  <span className="lp-pricing__name">Commercial Marketing</span>
                  <span className="lp-pricing__price">$850</span>
                </div>
                <ul className="lp-pricing__deliverables">
                  <li>4K video</li>
                  <li>3D model</li>
                  <li>Raw footage</li>
                  <li>Perpetual license</li>
                </ul>
                <a href="#quote?service=commercial-marketing" className="lp-cta-button lp-pricing__cta">Get a Quote</a>
              </div>

              <div className="lp-pricing__card">
                <div className="lp-pricing__card-header">
                  <span className="lp-pricing__name">Inspection Data</span>
                  <span className="lp-pricing__price">$1,200</span>
                </div>
                <ul className="lp-pricing__deliverables">
                  <li>Inspection grid photography</li>
                  <li>Annotated report</li>
                  <li>Exportable data</li>
                </ul>
                <a href="#quote?service=inspection-data" className="lp-cta-button lp-pricing__cta">Get a Quote</a>
              </div>
            </div>
          </div>
        </div>

        {/* Add Ons */}
        <div className="lp-pricing__addons">
          <h3 className="lp-pricing__addons-title">Add Ons</h3>
          <ul className="lp-pricing__addons-list">
            <li>Rush Premium: plus 25% for 24 hour delivery, plus 50% for same day</li>
            <li>Raw File Buyout: plus $250</li>
            <li>Brokerage Retainer: $1,500 per month for 5 Listing Pro shoots</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
