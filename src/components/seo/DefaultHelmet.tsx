import { Helmet } from 'react-helmet-async';

export default function DefaultHelmet() {
  return (
    <Helmet>
      <title>Trestle — Sentinel Aerial Inspections</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}
