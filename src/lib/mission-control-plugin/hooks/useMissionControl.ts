import { useState, useEffect, useCallback, useRef } from 'react';
import { getMissionControlConfig, type MissionControlConfig } from '../config/mission-control.config';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance' | 'outage' | 'resolved';
  starts_at: string;
  ends_at: string | null;
  priority: number;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HeartbeatResponse {
  success: boolean;
  announcements?: Announcement[];
  error?: string;
}

export interface TicketSubmission {
  type: 'bug' | 'feature' | 'maintenance' | 'question';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  page_url?: string;
  browser_info?: Record<string, unknown>;
}

export interface MissionControlState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  announcements: Announcement[];
  tickets: Ticket[];
  lastHeartbeat: Date | null;
}

export interface MissionControlActions {
  sendHeartbeat: () => Promise<HeartbeatResponse>;
  submitTicket: (ticket: TicketSubmission) => Promise<{ success: boolean; ticket_number?: string; error?: string }>;
  fetchTickets: () => Promise<void>;
  fetchAnnouncements: () => Promise<void>;
  dismissAnnouncement: (id: string) => void;
}

export function useMissionControl(configOverrides?: Partial<MissionControlConfig>) {
  const config = getMissionControlConfig(configOverrides);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());
  
  const [state, setState] = useState<MissionControlState>({
    isConnected: false,
    isLoading: true,
    error: null,
    announcements: [],
    tickets: [],
    lastHeartbeat: null,
  });

  const log = useCallback((message: string, data?: unknown) => {
    if (config.debug) {
      console.log(`[MissionControl] ${message}`, data || '');
    }
  }, [config.debug]);

  const apiRequest = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    const action = endpoint.replace('/', '');
    const url = `${config.hubUrl}?action=${action}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      ...config.customHeaders,
      ...(options.headers as Record<string, string> || {}),
    };

    log(`API Request: ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
  }, [config.hubUrl, config.apiKey, config.customHeaders, log]);

  const sendHeartbeat = useCallback(async (): Promise<HeartbeatResponse> => {
    try {
      const data = await apiRequest('/heartbeat', {
        method: 'POST',
        body: JSON.stringify({
          status: 'online',
          version: import.meta.env.VITE_APP_VERSION || '1.0.0',
          metrics: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
        }),
      });

      setState(prev => ({
        ...prev,
        isConnected: true,
        error: null,
        lastHeartbeat: new Date(),
        announcements: data.announcements || prev.announcements,
      }));

      log('Heartbeat sent successfully', data);
      return { success: true, announcements: data.announcements };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Heartbeat failed';
      log('Heartbeat failed', error);
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }, [apiRequest, log]);

  const submitTicket = useCallback(async (ticket: TicketSubmission) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const data = await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          ...ticket,
          page_url: ticket.page_url || window.location.href,
          browser_info: ticket.browser_info || {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          },
        }),
      });

      log('Ticket submitted successfully', data);

      // Refresh tickets list
      await fetchTickets();

      return { success: true, ticket_number: data.ticket_number };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit ticket';
      log('Ticket submission failed', error);
      return { success: false, error: errorMessage };
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [apiRequest, log]);

  const fetchTickets = useCallback(async () => {
    try {
      const data = await apiRequest('/tickets', { method: 'GET' });
      
      setState(prev => ({
        ...prev,
        tickets: data.tickets || [],
      }));

      log('Tickets fetched', data.tickets);
    } catch (error) {
      log('Failed to fetch tickets', error);
    }
  }, [apiRequest, log]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await apiRequest('/announcements', { method: 'GET' });
      
      setState(prev => ({
        ...prev,
        announcements: data.announcements || [],
      }));

      log('Announcements fetched', data.announcements);
    } catch (error) {
      log('Failed to fetch announcements', error);
    }
  }, [apiRequest, log]);

  const dismissAnnouncement = useCallback((id: string) => {
    setDismissedAnnouncements(prev => new Set([...prev, id]));
  }, []);

  // Filter out dismissed announcements
  const visibleAnnouncements = state.announcements.filter(
    a => !dismissedAnnouncements.has(a.id)
  );

  // Auto-register if no API key but bootstrap secret is available
  const autoRegister = useCallback(async (): Promise<string | null> => {
    if (!config.bootstrapSecret || !config.appCode) return null;

    log('No API key found. Attempting auto-registration...');

    try {
      const url = `${config.hubUrl}?action=register`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bootstrap-secret': config.bootstrapSecret,
        },
        body: JSON.stringify({
          name: config.appName || config.appCode,
          code: config.appCode,
          url: window.location.origin,
          version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        log('Auto-registration failed', data);
        return null;
      }

      log('Auto-registered successfully. Store this API key in VITE_MISSION_CONTROL_API_KEY:', data.apiKey);

      // Persist the key in localStorage so subsequent page loads use it
      localStorage.setItem(`mc_api_key_${config.appCode}`, data.apiKey);

      return data.apiKey as string;
    } catch (error) {
      log('Auto-registration error', error);
      return null;
    }
  }, [config.bootstrapSecret, config.appCode, config.appName, config.hubUrl, log]);

  // Initialize and start heartbeat
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Try stored key from localStorage (from previous auto-registration)
      let activeKey = config.apiKey || localStorage.getItem(`mc_api_key_${config.appCode}`) || '';

      // No key at all? Try auto-registration
      if (!activeKey && config.bootstrapSecret) {
        const registered = await autoRegister();
        if (registered) {
          activeKey = registered;
        }
      }

      if (!activeKey) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'No API key and no bootstrap secret configured',
        }));
        return;
      }

      // Patch the apiRequest to use the resolved key
      // (config.apiKey may still be empty if key came from localStorage/registration)
      if (!config.apiKey && activeKey) {
        config.apiKey = activeKey;
      }

      if (cancelled) return;

      // Initial heartbeat
      await sendHeartbeat();
      if (cancelled) return;
      setState(prev => ({ ...prev, isLoading: false }));

      // Fetch initial data
      fetchTickets();

      // Set up heartbeat interval
      if (config.heartbeatInterval && config.heartbeatInterval > 0) {
        heartbeatIntervalRef.current = setInterval(() => {
          sendHeartbeat();
        }, config.heartbeatInterval);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [config.apiKey, config.appCode, config.bootstrapSecret, config.heartbeatInterval, sendHeartbeat, fetchTickets, autoRegister]);

  return {
    ...state,
    announcements: visibleAnnouncements,
    actions: {
      sendHeartbeat,
      submitTicket,
      fetchTickets,
      fetchAnnouncements,
      dismissAnnouncement,
    } as MissionControlActions,
  };
}
