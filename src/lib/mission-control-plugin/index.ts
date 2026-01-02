/**
 * Mission Control Plugin
 * 
 * A plugin for satellite applications to connect to the Faith & Harmony Hub's
 * centralized Mission Control system for health monitoring, ticket management,
 * and system announcements.
 * 
 * @example
 * ```tsx
 * // In your App.tsx
 * import { MissionControlProvider, MissionControlWidget } from '@/lib/mission-control-plugin';
 * 
 * function App() {
 *   return (
 *     <MissionControlProvider config={{ apiKey: 'your-api-key', appCode: 'your-app' }}>
 *       <YourApp />
 *       <MissionControlWidget />
 *     </MissionControlProvider>
 *   );
 * }
 * ```
 */

// Configuration
export { 
  missionControlConfig, 
  getMissionControlConfig,
  type MissionControlConfig 
} from './config/mission-control.config';

// Hooks
export { 
  useMissionControl,
  type Announcement,
  type Ticket,
  type HeartbeatResponse,
  type TicketSubmission,
  type MissionControlState,
  type MissionControlActions,
} from './hooks/useMissionControl';

// Components
export { MissionControlProvider, useMissionControlContext } from './components/MissionControlProvider';
export { MissionControlWidget } from './components/MissionControlWidget';
export { TicketSubmissionForm } from './components/TicketSubmissionForm';
export { TicketList } from './components/TicketList';
export { AnnouncementBanner } from './components/AnnouncementBanner';
