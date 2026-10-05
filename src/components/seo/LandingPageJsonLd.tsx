import { FAQ_ITEMS } from '@/components/landing/FAQSection';

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Sentinel Aerial Inspections",
  "alternateName": "Faith & Harmony LLC",
  "description": "Veteran owned drone services company providing aerial photography, property inspections, and 3D photogrammetry in Hampton Roads VA and surrounding areas.",
  "url": "https://sentinelaerialinspections.com",
  "telephone": "+17578438772",
  "email": "info@faithandharmonyllc.com",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Chesapeake",
    "addressRegion": "VA",
    "addressCountry": "US"
  },
  "areaServed": [
    "Virginia Beach, VA",
    "Norfolk, VA",
    "Chesapeake, VA",
    "Portsmouth, VA",
    "Newport News, VA",
    "Hampton, VA",
    "Suffolk, VA",
    "Williamsburg, VA",
    "Maryland",
    "Northern North Carolina"
  ],
  "hasCredential": [
    "FAA Part 107 Remote Pilot Certificate",
    "LAANC Authorization",
    "$1M Liability Insurance"
  ],
  "foundingDate": "2026",
  "founder": {
    "@type": "Person",
    "name": "Dr. Adam Pierce",
    "jobTitle": "Owner and Chief Pilot"
  }
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "name": "Listing Pro Aerial Photography",
      "description": "25 edited aerial photos, a 60 second highlight reel and an illustrative property overlay. Standard delivery within 48 hours after capture.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": { "@type": "Offer", "price": "450", "priceCurrency": "USD" }
    },
    {
      "@type": "Service",
      "name": "Luxury Listing Aerial Photography",
      "description": "40+ edited photos, 2 minute cinematic video, twilight shoot, 24 hour priority delivery.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": { "@type": "Offer", "price": "750", "priceCurrency": "USD" }
    },
    {
      "@type": "Service",
      "name": "Construction Progress Monitoring",
      "description": "25 labeled photos and four short video clips with compass-bearing views for progress comparisons, per visit.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": { "@type": "Offer", "price": "450", "priceCurrency": "USD" }
    },
    {
      "@type": "Service",
      "name": "Commercial Marketing Package",
      "description": "30+ edited aerial photos, a 90 second highlight video and an illustrative property overlay.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": { "@type": "Offer", "price": "850", "priceCurrency": "USD" }
    },
    {
      "@type": "Service",
      "name": "Roof Documentation",
      "description": "Visual roof documentation with grid photography, detail images and an annotated report for review by your qualified professional.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": { "@type": "Offer", "price": "1200", "priceCurrency": "USD" }
    }
  ]
};

export default function LandingPageJsonLd() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
