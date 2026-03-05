import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// ============================================
// MISSION CONTROL API
// ============================================
// Public API for client apps to communicate with the hub.
// All endpoints require API key authentication.
//
// Endpoints:
//   POST /register      - Self-register with bootstrap secret (no API key needed)
//   POST /heartbeat     - Report app health status
//   POST /tickets       - Submit new maintenance ticket
//   GET  /tickets       - Get app's tickets
//   GET  /announcements - Get active announcements

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RegisterRequest {
  name: string;
  code: string;
  url?: string;
  ownerEmail?: string;
  ownerName?: string;
  version?: string;
}

interface HeartbeatRequest {
  status?: 'online' | 'degraded' | 'offline';
  version?: string;
  metrics?: Record<string, unknown>;
  responseTimeMs?: number;
}

interface TicketRequest {
  title: string;
  description?: string;
  type?: 'bug' | 'feature-request' | 'break-fix' | 'question';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'database' | 'ui' | 'api' | 'performance' | 'security' | 'other';
  reporterEmail?: string;
  reporterName?: string;
  stepsToReproduce?: string;
  pageUrl?: string;
  browserInfo?: Record<string, unknown>;
  externalReference?: string;
}

interface ValidatedApp {
  app_id: string;
  app_name: string;
  app_code: string;
  is_valid: boolean;
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const endpoint = pathParts[pathParts.length - 1]; // Last segment

    console.log(`Mission Control API: ${req.method} /${endpoint}`);

    // Registration endpoint uses bootstrap secret instead of API key
    if (endpoint === 'register' && req.method === 'POST') {
      return await handleRegister(supabase, req);
    }

    // Extract and validate API key
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey) {
      return jsonResponse({ error: 'Missing API key. Include x-api-key header.' }, 401);
    }

    // Validate API key and get app info
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_api_key', { p_api_key: apiKey });

    if (validationError || !validationResult || validationResult.length === 0) {
      console.error('API key validation failed:', validationError);
      return jsonResponse({ error: 'Invalid API key' }, 401);
    }

    const app: ValidatedApp = validationResult[0];
    
    if (!app.is_valid) {
      return jsonResponse({ error: 'API key is invalid or app is inactive' }, 401);
    }

    console.log(`Authenticated app: ${app.app_name} (${app.app_id})`);

    // Route to appropriate handler
    switch (endpoint) {
      case 'heartbeat':
        if (req.method !== 'POST') {
          return jsonResponse({ error: 'Method not allowed' }, 405);
        }
        return await handleHeartbeat(supabase, app, req);

      case 'tickets':
        if (req.method === 'POST') {
          return await handleCreateTicket(supabase, app, req);
        } else if (req.method === 'GET') {
          return await handleGetTickets(supabase, app, url);
        }
        return jsonResponse({ error: 'Method not allowed' }, 405);

      case 'announcements':
        if (req.method !== 'GET') {
          return jsonResponse({ error: 'Method not allowed' }, 405);
        }
        return await handleGetAnnouncements(supabase, app);

      default:
        return jsonResponse({ error: `Unknown endpoint: ${endpoint}` }, 404);
    }

  } catch (error) {
    console.error('Mission Control API Error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500
    );
  }
});

// ============================================
// ENDPOINT HANDLERS
// ============================================

/**
 * POST /heartbeat
 * Records app health status and updates last_heartbeat_at
 */
async function handleHeartbeat(
  supabase: ReturnType<typeof createClient>,
  app: ValidatedApp,
  req: Request
): Promise<Response> {
  const body: HeartbeatRequest = await req.json().catch(() => ({}));

  const { error } = await supabase.rpc('record_app_heartbeat', {
    p_app_id: app.app_id,
    p_status: body.status || 'online',
    p_version: body.version || null,
    p_metrics: body.metrics || {},
    p_response_time_ms: body.responseTimeMs || null,
  });

  if (error) {
    console.error('Heartbeat recording failed:', error);
    return jsonResponse({ error: 'Failed to record heartbeat' }, 500);
  }

  return jsonResponse({
    success: true,
    message: 'Heartbeat recorded',
    app: app.app_name,
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /tickets
 * Creates a new maintenance ticket from the client app
 */
async function handleCreateTicket(
  supabase: ReturnType<typeof createClient>,
  app: ValidatedApp,
  req: Request
): Promise<Response> {
  const body: TicketRequest = await req.json();

  // Validate required fields
  if (!body.title || body.title.trim().length === 0) {
    return jsonResponse({ error: 'Title is required' }, 400);
  }

  // Insert ticket
  const { data: ticket, error } = await supabase
    .from('maintenance_tickets')
    .insert({
      app_id: app.app_id,
      type: body.type || 'bug',
      priority: body.priority || 'medium',
      category: body.category || 'other',
      status: 'open',
      title: body.title.trim(),
      description: body.description || null,
      steps_to_reproduce: body.stepsToReproduce || null,
      reporter_email: body.reporterEmail || null,
      reporter_name: body.reporterName || null,
      page_url: body.pageUrl || null,
      browser_info: body.browserInfo || null,
      external_reference: body.externalReference || null,
      submitted_via: 'plugin',
    })
    .select('id, ticket_number, status, priority, created_at')
    .single();

  if (error) {
    console.error('Ticket creation failed:', error);
    return jsonResponse({ error: 'Failed to create ticket' }, 500);
  }

  console.log(`Ticket ${ticket.ticket_number} created for ${app.app_name}`);

  return jsonResponse({
    success: true,
    ticket: {
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.created_at,
    },
    message: `Ticket ${ticket.ticket_number} created successfully`,
  }, 201);
}

/**
 * GET /tickets
 * Returns tickets for the authenticated app
 * Query params: status, limit, offset
 */
async function handleGetTickets(
  supabase: ReturnType<typeof createClient>,
  app: ValidatedApp,
  url: URL
): Promise<Response> {
  const status = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = supabase
    .from('maintenance_tickets')
    .select(`
      id,
      ticket_number,
      type,
      priority,
      category,
      status,
      title,
      description,
      reporter_name,
      reporter_email,
      resolution,
      created_at,
      updated_at,
      resolved_at
    `)
    .eq('app_id', app.app_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: tickets, error } = await query;

  if (error) {
    console.error('Failed to fetch tickets:', error);
    return jsonResponse({ error: 'Failed to fetch tickets' }, 500);
  }

  // Get total count for pagination
  const { count: totalCount } = await supabase
    .from('maintenance_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('app_id', app.app_id);

  return jsonResponse({
    tickets: tickets?.map(t => ({
      id: t.id,
      ticketNumber: t.ticket_number,
      type: t.type,
      priority: t.priority,
      category: t.category,
      status: t.status,
      title: t.title,
      description: t.description,
      reporterName: t.reporter_name,
      reporterEmail: t.reporter_email,
      resolution: t.resolution,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      resolvedAt: t.resolved_at,
    })) || [],
    pagination: {
      total: totalCount || 0,
      limit,
      offset,
      hasMore: (offset + limit) < (totalCount || 0),
    },
  });
}

/**
 * GET /announcements
 * Returns active announcements relevant to this app
 */
async function handleGetAnnouncements(
  supabase: ReturnType<typeof createClient>,
  app: ValidatedApp
): Promise<Response> {
  const { data: announcements, error } = await supabase
    .rpc('get_app_announcements', { p_app_id: app.app_id });

  if (error) {
    console.error('Failed to fetch announcements:', error);
    return jsonResponse({ error: 'Failed to fetch announcements' }, 500);
  }

  return jsonResponse({
    announcements: announcements?.map((a: Record<string, unknown>) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      type: a.type,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      priority: a.priority,
    })) || [],
  });
}

/**
 * POST /register
 * Self-register a satellite app using the shared bootstrap secret.
 * Returns a fresh API key the app stores for all future requests.
 */
async function handleRegister(
  supabase: ReturnType<typeof createClient>,
  req: Request
): Promise<Response> {
  const bootstrapSecret = Deno.env.get('MC_BOOTSTRAP_SECRET');

  if (!bootstrapSecret) {
    console.error('MC_BOOTSTRAP_SECRET not configured');
    return jsonResponse({ error: 'Registration is not enabled on this hub' }, 503);
  }

  const providedSecret = req.headers.get('x-bootstrap-secret');

  if (!providedSecret || providedSecret !== bootstrapSecret) {
    return jsonResponse({ error: 'Invalid bootstrap secret' }, 401);
  }

  const body: RegisterRequest = await req.json();

  if (!body.name || !body.code) {
    return jsonResponse({ error: 'name and code are required' }, 400);
  }

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(body.code)) {
    return jsonResponse(
      { error: 'code must be lowercase alphanumeric with hyphens/underscores, starting with a letter or number' },
      400
    );
  }

  const { data, error } = await supabase.rpc('register_app_with_bootstrap', {
    p_name: body.name,
    p_code: body.code,
    p_url: body.url || null,
    p_owner_email: body.ownerEmail || null,
    p_owner_name: body.ownerName || null,
    p_version: body.version || null,
  });

  if (error) {
    console.error('Registration failed:', error);
    const isDuplicate = error.message?.includes('already registered');
    return jsonResponse(
      { error: isDuplicate ? error.message : 'Registration failed' },
      isDuplicate ? 409 : 500
    );
  }

  const result = data?.[0];

  if (!result) {
    return jsonResponse({ error: 'Registration failed unexpectedly' }, 500);
  }

  console.log(`App registered: ${body.name} (${body.code}) -> ${result.app_id}`);

  return jsonResponse({
    success: true,
    appId: result.app_id,
    apiKey: result.api_key,
    message: `App "${body.name}" registered. Store the API key securely; it cannot be retrieved again.`,
  }, 201);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}