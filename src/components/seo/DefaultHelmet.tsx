import { Helmet } from 'react-helmet-async';

const isTrestle = window.location.hostname.includes('trestle');

export default function DefaultHelmet() {
  return (
    <Helmet>
      <title>{isTrestle ? 'Trestle — Sentinel Aerial Inspections' : 'Faith & Harmony LLC'}</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}
