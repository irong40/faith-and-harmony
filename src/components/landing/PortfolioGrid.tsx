interface PortfolioItem {
  src: string;
  alt: string;
  label: string;
  width: number;
  height: number;
}

const PORTFOLIO_ITEMS: PortfolioItem[] = [
  { src: "/assets/aerial/creek-after.png", alt: "Aerial view of creek property after editing, Hampton Roads VA", label: "Residential Listing", width: 1200, height: 800 },
  { src: "/assets/aerial/dock-after.png", alt: "Aerial view of waterfront dock property after editing, Hampton Roads VA", label: "Residential Listing", width: 1200, height: 800 },
  { src: "/assets/aerial/trees-after.png", alt: "Aerial view of wooded property after editing, Hampton Roads VA", label: "Residential Listing", width: 1200, height: 800 },
  { src: "/assets/aerial/creek-before.jpg", alt: "Aerial view of creek property, Hampton Roads VA", label: "Property Overview", width: 1200, height: 800 },
  { src: "/assets/aerial/dock-before.jpg", alt: "Aerial view of waterfront dock, Hampton Roads VA", label: "Property Overview", width: 1200, height: 800 },
  { src: "/assets/aerial/trees-before.jpg", alt: "Aerial view of wooded property, Hampton Roads VA", label: "Property Overview", width: 1200, height: 800 },
];

export default function PortfolioGrid() {
  return (
    <section className="lp-portfolio" id="portfolio" aria-label="Portfolio">
      <div className="lp-container">
        <h2 className="lp-section-title">Our Work</h2>
        <p className="lp-portfolio-grid__subtitle">
          Aerial photography and property documentation across Hampton Roads. All photos captured with FAA Part 107 certified pilots.
        </p>
        <div className="lp-portfolio-grid__grid">
          {PORTFOLIO_ITEMS.map((item, index) => (
            <div key={index} className="lp-portfolio-grid__item">
              <img
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                loading="lazy"
              />
              <div className="lp-portfolio-grid__label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
