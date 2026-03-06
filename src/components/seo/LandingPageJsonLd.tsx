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
    "addressLocality": "Virginia Beach",
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
      "name": "Listing Lite Aerial Photography",
      "description": "10 edited aerial photos with sky replacement. Next day delivery.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": { "@type": "Offer", "price": "225", "priceCurrency": "USD" }
    },
    {
      "@type": "Service",
      "name": "Listing Pro Aerial Photography",
      "description": "25 edited aerial photos, 60 second reel, 2D boundary overlay, 48 hour turnaround.",
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
      "description": "Orthomosaic, site overview, date stamped archive per visit.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": { "@type": "Offer", "price": "450", "priceCurrency": "USD" }
    },
    {
      "@type": "Service",
      "name": "Commercial Marketing Package",
      "description": "4K video, 3D model, raw footage, perpetual license.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": { "@type": "Offer", "price": "850", "priceCurrency": "USD" }
    },
    {
      "@type": "Service",
      "name": "Inspection Data Package",
      "description": "Inspection grid photography, annotated report, exportable data.",
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
