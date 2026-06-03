import { Helmet } from 'react-helmet-async';

const SITE_URL = import.meta.env.VITE_PUBLIC_URL || 'https://faithandharmonyllc.com';
const TITLE = 'Government Contracting & Capabilities | Sentinel Aerial Inspections';
const DESCRIPTION =
  'Capability statement for Sentinel Aerial Inspections (Faith & Harmony LLC) — veteran-owned aerial intelligence for federal and state contracting. SAM.gov UEI JBPVN2EFN6S7, CAGE 20CX8. Drone imaging, AI wildlife census, 3D photogrammetry, and federal-grade data handling in Hampton Roads, VA.';

export default function CapabilitiesHelmet() {
  return (
    <Helmet>
      <title>{TITLE}</title>
      <meta name="description" content={DESCRIPTION} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={`${SITE_URL}/capabilities`} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={`${SITE_URL}/capabilities`} />
      <meta property="og:title" content={TITLE} />
      <meta property="og:description" content={DESCRIPTION} />
      <meta property="og:image" content={`${SITE_URL}/assets/landing/hero-banner.jpg`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Sentinel Aerial Inspections" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={TITLE} />
      <meta name="twitter:description" content={DESCRIPTION} />
      <meta name="twitter:image" content={`${SITE_URL}/assets/landing/hero-banner.jpg`} />
    </Helmet>
  );
}
