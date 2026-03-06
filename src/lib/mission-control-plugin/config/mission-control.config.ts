/**
 * Mission Control Plugin Configuration
 * 
 * Configure these values for your satellite application to connect
 * to the Trestle Hub's Mission Control system.
 */

export interface MissionControlConfig {
  /** The base URL of the Mission Control hub */
  hubUrl: string;

  /** Your app's unique API key (obtained from Hub admin or auto-registration) */
  apiKey: string;

  /** Your app's unique code (e.g., 'my-app') */
  appCode: string;

  /** Display name for this app (used during auto-registration) */
  appName?: string;

  /** Bootstrap secret for auto-registration (set MC_BOOTSTRAP_SECRET on hub) */
  bootstrapSecret?: string;

  /** Heartbeat interval in milliseconds (default: 5 minutes) */
  heartbeatInterval?: number;

  /** Enable debug logging */
  debug?: boolean;

  /** Custom headers to include in requests */
  customHeaders?: Record<string, string>;
}

// Default configuration - UPDATE THESE VALUES
export const missionControlConfig: MissionControlConfig = {
  hubUrl: 'https://qjpujskwqaehxnqypxzu.supabase.co/functions/v1/mission-control-api',
  apiKey: '', // Set via environment variable: import.meta.env.VITE_MISSION_CONTROL_API_KEY
  appCode: '', // Set via environment variable: import.meta.env.VITE_APP_CODE
  heartbeatInterval: 5 * 60 * 1000, // 5 minutes
  debug: false,
};

/**
 * Get the configured Mission Control settings
 * Merges environment variables with defaults
 */
export function getMissionControlConfig(overrides?: Partial<MissionControlConfig>): MissionControlConfig {
  return {
    ...missionControlConfig,
    apiKey: import.meta.env.VITE_MISSION_CONTROL_API_KEY || missionControlConfig.apiKey,
    appCode: import.meta.env.VITE_APP_CODE || missionControlConfig.appCode,
    appName: import.meta.env.VITE_APP_NAME || overrides?.appName || missionControlConfig.appName,
    bootstrapSecret: import.meta.env.VITE_MC_BOOTSTRAP_SECRET || overrides?.bootstrapSecret || missionControlConfig.bootstrapSecret,
    debug: import.meta.env.DEV || missionControlConfig.debug,
    ...overrides,
  };
}
