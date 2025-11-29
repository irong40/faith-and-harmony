import { Link } from "react-router-dom";
import { Youtube, Facebook, Instagram } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center space-x-3 mb-4">
              <img src={logoIcon} alt="Faith & Harmony" className="w-10 h-10" />
              <span className="text-lg font-bold text-primary font-display">Faith & Harmony</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Rooted in Purpose, Driven by Service. Empowering communities through technology, creativity, and faith.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-primary mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-muted-foreground hover:text-accent transition-colors text-sm">Home</Link></li>
              <li><Link to="/services" className="text-muted-foreground hover:text-accent transition-colors text-sm">Services</Link></li>
              <li><Link to="/shop" className="text-muted-foreground hover:text-accent transition-colors text-sm">Shop</Link></li>
              <li><Link to="/request-service" className="text-muted-foreground hover:text-accent transition-colors text-sm">Request Service</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-accent transition-colors text-sm">Contact</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-bold text-primary mb-4">Services</h4>
            <ul className="space-y-2">
              <li><Link to="/services/ai-video-creation" className="text-muted-foreground hover:text-accent transition-colors text-sm">AI Video Creation</Link></li>
              <li><Link to="/services/masonic-digital-projects" className="text-muted-foreground hover:text-accent transition-colors text-sm">Masonic & OES Projects</Link></li>
              <li><Link to="/services/cybersecurity-ai" className="text-muted-foreground hover:text-accent transition-colors text-sm">Cybersecurity Services</Link></li>
              <li><Link to="/services/church-tech" className="text-muted-foreground hover:text-accent transition-colors text-sm">Church Tech</Link></li>
              <li><Link to="/services/website-hosting" className="text-muted-foreground hover:text-accent transition-colors text-sm">Website Hosting</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-primary mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li>
                <a href="tel:760-575-4876" className="text-muted-foreground hover:text-accent transition-colors text-sm flex items-center gap-2">
                  <span>📞</span> 760-575-4876
                </a>
              </li>
              <li>
                <a href="mailto:dradamopierce@gmail.com" className="text-muted-foreground hover:text-accent transition-colors text-sm flex items-center gap-2">
                  <span>📧</span> dradamopierce@gmail.com
                </a>
              </li>
              <li className="text-muted-foreground text-sm flex items-center gap-2">
                <span>🌐</span> faithandharmonyllc.com
              </li>
            </ul>
            
            {/* Social Links */}
            <div className="flex gap-4 mt-4">
              <a href="https://www.youtube.com/@TheyNeverToldUs" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-all duration-200 hover:scale-110" aria-label="YouTube">
                <Youtube size={24} />
              </a>
              <a href="https://www.facebook.com/profile.php?id=100095381376731" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-all duration-200 hover:scale-110" aria-label="Facebook">
                <Facebook size={24} />
              </a>
              <a href="https://www.instagram.com/faithharmony4045/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-all duration-200 hover:scale-110" aria-label="Instagram">
                <Instagram size={24} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Faith & Harmony LLC. All rights reserved.
          </p>
          <p className="text-accent text-xs mt-2 font-semibold">
            Dr. Adam Pierce - Rooted in Purpose, Driven by Service
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
