import { useState, useEffect } from 'react';

export default function StickyNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`lp-sticky-nav${visible ? ' lp-sticky-nav--visible' : ''}`}>
      <div className="lp-container">
        <div className="lp-sticky-nav__links">
          <a href="#services">Services</a>
          <a href="#pricing">Pricing</a>
          <a href="#portfolio">Portfolio</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="lp-sticky-nav__actions">
          <a href="tel:7605754876" className="lp-sticky-nav__phone">760.575.4876</a>
          <a href="#quote" className="lp-cta-button lp-sticky-nav__cta">Get a Quote</a>
        </div>
      </div>
    </nav>
  );
}
