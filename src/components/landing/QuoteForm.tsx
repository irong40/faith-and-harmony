import { useState, useEffect } from 'react';

const SERVICE_OPTIONS = [
  { value: 'listing-lite', label: 'Listing Lite ($225)' },
  { value: 'listing-pro', label: 'Listing Pro ($450)' },
  { value: 'luxury-listing', label: 'Luxury Listing ($750)' },
  { value: 'construction-progress', label: 'Construction Progress ($450/visit)' },
  { value: 'commercial-marketing', label: 'Commercial Marketing ($850)' },
  { value: 'roof-inspection', label: 'Roof Inspection (Quote)' },
  { value: 'land-survey', label: 'Land Survey & Mapping (Quote)' },
  { value: 'insurance-documentation', label: 'Insurance Documentation (Quote)' },
  { value: 'solar-inspection', label: 'Solar Panel Inspection (Quote)' },
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  service_type: string;
  preferred_date: string;
  message: string;
}

export default function QuoteForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    service_type: '',
    preferred_date: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#quote?service=')) {
      const serviceValue = hash.replace('#quote?service=', '');
      const match = SERVICE_OPTIONS.find((opt) => opt.value === serviceValue);
      if (match) setFormData((prev) => ({ ...prev, service_type: serviceValue }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="lp-quote" id="quote" aria-label="Request a quote">
      <div className="lp-container">
        <h2 className="lp-section-title">REQUEST A QUOTE</h2>
        <div className="lp-quote-form-wrapper">
          {status === 'success' ? (
            <div className="lp-quote-confirmation">
              <h3>REQUEST RECEIVED</h3>
              <p>Your quote request was submitted. Expect a response within one business day. Check your email for confirmation.</p>
            </div>
          ) : (
            <form className="lp-quote-form" onSubmit={handleSubmit}>
              <div className="lp-quote-field">
                <label htmlFor="quote-name">Name</label>
                <input type="text" id="quote-name" name="name" required placeholder="Your name" value={formData.name} onChange={handleChange} />
              </div>
              <div className="lp-quote-field">
                <label htmlFor="quote-email">Email</label>
                <input type="email" id="quote-email" name="email" required placeholder="Your email address" value={formData.email} onChange={handleChange} />
              </div>
              <div className="lp-quote-field">
                <label htmlFor="quote-phone">Phone</label>
                <input type="tel" id="quote-phone" name="phone" placeholder="Your phone number" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="lp-quote-field">
                <label htmlFor="quote-service">Service Type</label>
                <select id="quote-service" name="service_type" value={formData.service_type} onChange={handleChange}>
                  <option value="" disabled>Select a service</option>
                  {SERVICE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="lp-quote-field">
                <label htmlFor="quote-date">Preferred Date</label>
                <input type="date" id="quote-date" name="preferred_date" value={formData.preferred_date} onChange={handleChange} />
              </div>
              <div className="lp-quote-field">
                <label htmlFor="quote-message">Message</label>
                <textarea id="quote-message" name="message" rows={4} placeholder="Describe your project or ask a question" value={formData.message} onChange={handleChange} />
              </div>
              {status === 'error' && (
                <p className="lp-quote-error">Something went wrong. Call 757.843.8772 or email contact@sentinelaerial.com directly.</p>
              )}
              <button type="submit" className="lp-cta-button" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'SENDING...' : 'SEND REQUEST'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
