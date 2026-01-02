/**
 * Mission Control Plugin Configuration
 * 
 * Configure these values for your satellite application to connect
 * to the Faith & Harmony Hub's Mission Control system.
 */

export interface MissionControlConfig {
  /** The base URL of the Mission Control hub */
  hubUrl: string;
  
  /** Your app's unique API key (obtained from Hub admin) */
  apiKey: string;
  
  /** Your app's unique code (e.g., 'my-app') */
  appCode: string;
  
  /** Heartbeat interval in milliseconds (default: 5 minutes) */
  heartbeatInterval?: number;
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Custom headers to include in requests */
  customHeaders?: Record<string, string>;
}

// Default configuration - UPDATE THESE VALUES
export const missionControlConfig: MissionControlConfig = {
  hubUrl: 'https://cwaxhfmstlkxqpuhbrbv.supabase.co/functions/v1/mission-control-api',
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
    debug: import.meta.env.DEV || missionControlConfig.debug,
    ...overrides,
  };
}
