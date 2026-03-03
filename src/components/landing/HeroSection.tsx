export default function HeroSection() {
  return (
    <section className="lp-hero" aria-label="Hero">
      <img
        className="lp-hero-bg-img"
        src="/assets/landing/hero-banner.jpg"
        alt="Aerial view of Hampton Roads Virginia from a drone"
        width={1920}
        height={1080}
        fetchPriority="high"
      />
      <div className="lp-container">
        <h1 className="lp-hero__headline">
          <span className="lp-hero__headline-main">Drone Photography and Aerial Inspections</span>
          <span className="lp-hero__headline-location">Hampton Roads VA</span>
        </h1>
        <p className="lp-hero__sub">
          Real estate agents and contractors across Hampton Roads rely on Sentinel for aerial photos, inspection data, and construction documentation. FAA Part 107 certified. Delivered in 48 hours or less.
        </p>
        <div className="lp-hero__actions">
          <a href="#quote" className="lp-cta-button">Get a Quote</a>
          <a href="tel:7578438772" className="lp-hero__phone">757.843.8772</a>
        </div>
      </div>
    </section>
  );
}
