// Pricing Lookup Edge Function
// Phase 1: Intake API and Lead Tracking (INTAKE-04)
//
// Returns canonical package pricing and deliverables for mid-call Vapi bot queries.
// Read only, no database access. Prices are locked values from CLAUDE.md.
//
// Endpoints:
//   GET ?service_type=re_basic  -> Single package
//   GET (no params)             -> All packages + add-ons
//   OPTIONS                     -> CORS preflight

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Canonical prices from CLAUDE.md. Do not modify without updating CLAUDE.md.
export const PACKAGES: Record<string, { name: string; price: number; unit?: string; deliverables: string[] }> = {
  re_basic: {
    name: 'Listing Lite',
    price: 225,
    deliverables: ['10 photos', 'Sky replacement', 'Next day delivery'],
  },
  re_standard: {
    name: 'Listing Pro',
    price: 450,
    deliverables: ['25 photos', '60 second reel', '2D boundary overlay', '48 hour turnaround'],
  },
  re_premium: {
    name: 'Luxury Listing',
    price: 750,
    deliverables: ['40+ photos', '2 minute cinematic video', 'Twilight shoot', '24 hour priority'],
  },
  construction: {
    name: 'Construction Progress',
    price: 450,
    unit: '/visit',
    deliverables: ['Orthomosaic', 'Site overview', 'Date stamped archive'],
  },
  commercial: {
    name: 'Commercial Marketing',
    price: 850,
    deliverables: ['4K video', '3D model', 'Raw footage', 'Perpetual license'],
  },
  inspection: {
    name: 'Inspection Data',
    price: 1200,
    deliverables: ['Inspection grid photography', 'Annotated report', 'Exportable data'],
  },
};

export const ADD_ONS: Record<string, { name: string; modifier?: string; flat_fee?: number; description?: string }> = {
  rush_24h: {
    name: 'Rush Premium 24 hour',
    modifier: '+25%',
  },
  rush_same_day: {
    name: 'Rush Premium same day',
    modifier: '+50%',
  },
  raw_buyout: {
    name: 'Raw File Buyout',
    flat_fee: 250,
  },
  brokerage_retainer: {
    name: 'Brokerage Retainer',
    flat_fee: 1500,
    description: '$1,500/month for 5 Listing Pro shoots',
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function handleRequest(req: Request): Response {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET only
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(req.url);
  const serviceType = url.searchParams.get('service_type');

  // No filter: return all packages and add-ons
  if (!serviceType) {
    return json({ packages: PACKAGES, add_ons: ADD_ONS });
  }

  // Single package lookup
  const pkg = PACKAGES[serviceType];
  if (!pkg) {
    return json({ error: `Unknown service type: ${serviceType}` }, 404);
  }

  return json({ service_type: serviceType, ...pkg });
}

serve(handleRequest);
