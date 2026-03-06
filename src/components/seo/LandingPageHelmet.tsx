import { Helmet } from 'react-helmet-async';

const SITE_URL = import.meta.env.VITE_PUBLIC_URL || 'https://faithandharmonyllc.com';
const DESCRIPTION = 'Veteran owned drone services in Hampton Roads VA. FAA Part 107 certified, LAANC authorized for military airspace, 48 hour turnaround. Aerial photography, property inspections, and 3D photogrammetry for real estate professionals and commercial contractors.';

export default function LandingPageHelmet() {
  return (
    <Helmet>
      <title>Drone Photography &amp; Aerial Inspections | Hampton Roads VA</title>
      <meta name="description" content={DESCRIPTION} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={SITE_URL} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:title" content="Drone Photography & Aerial Inspections | Hampton Roads VA" />
      <meta property="og:description" content={DESCRIPTION} />
      <meta property="og:image" content={`${SITE_URL}/assets/landing/hero-banner.jpg`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Sentinel Aerial Inspections" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Drone Photography & Aerial Inspections | Hampton Roads VA" />
      <meta name="twitter:description" content={DESCRIPTION} />
      <meta name="twitter:image" content={`${SITE_URL}/assets/landing/hero-banner.jpg`} />
    </Helmet>
  );
}
