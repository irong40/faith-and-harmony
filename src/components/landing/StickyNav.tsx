import { useState, useEffect } from 'react';

export default function StickyNav() {
  const [visible, setVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutsideClick = () => setIsMenuOpen(false);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMenuOpen]);

  return (
    <nav className={`lp-sticky-nav${visible ? ' lp-sticky-nav--visible' : ''}`}>
      <div className="lp-container">
        <div className={`lp-sticky-nav__links${isMenuOpen ? ' lp-nav-mobile-open' : ''}`}>
          <a href="#services" onClick={() => setIsMenuOpen(false)}>Services</a>
          <a href="#pricing" onClick={() => setIsMenuOpen(false)}>Pricing</a>
          <a href="#portfolio" onClick={() => setIsMenuOpen(false)}>Portfolio</a>
          <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
        </div>
        <div className="lp-sticky-nav__actions">
          <a href="tel:7605754876" className="lp-sticky-nav__phone">760.575.4876</a>
          <a href="#quote" className="lp-cta-button lp-sticky-nav__cta">Get a Quote</a>
        </div>
        <button
          className={`lp-nav-hamburger${isMenuOpen ? ' lp-nav-hamburger--open' : ''}`}
          onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }}
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
