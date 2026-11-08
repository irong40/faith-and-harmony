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
    "Northern North Carolina"
  ],
  "hasCredential": [
    "$1M Liability Insurance"
  ],
  "foundingDate": "2026",
  "founder": {
    "@type": "Person",
    "name": "Dr. Adam Pierce",
    "jobTitle": "Owner and Chief Pilot",
    "hasCredential": {
      "@type": "EducationalOccupationalCredential",
      "name": "FAA Part 107 Remote Pilot Certificate",
      "credentialCategory": "certificate",
      "recognizedBy": { "@type": "GovernmentOrganization", "name": "Federal Aviation Administration" }
    }
  }
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "name": "Listing Pro Aerial Photography",
      "description": "25 edited aerial photos, 60 second reel, 2D boundary overlay, 48 hour delivery.",
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
      "description": "25 labeled photos, 4 short video clips, compass bearing shots, progress comparison ready, 48 hour delivery.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": { "@type": "Offer", "price": "450", "priceCurrency": "USD" }
    },
    {
      "@type": "Service",
      "name": "Commercial Marketing Package",
      "description": "30+ edited photos, 90 second highlight video, property boundaries overlay, premium color grading, 48 hour delivery.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": { "@type": "Offer", "price": "850", "priceCurrency": "USD" }
    },
    {
      "@type": "Service",
      "name": "Roof and Facility Inspection",
      "description": "Systematic roof inspection with grid photography and annotated report. Starting at $1,200.",
      "provider": { "@type": "LocalBusiness", "name": "Sentinel Aerial Inspections" },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "USD",
        "priceSpecification": { "@type": "PriceSpecification", "minPrice": "1200", "priceCurrency": "USD" }
      }
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
