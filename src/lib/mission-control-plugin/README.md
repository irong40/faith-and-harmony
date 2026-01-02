# Mission Control Plugin

A plugin for satellite applications to connect to the Faith & Harmony Hub's centralized Mission Control system.

## Features

- **Heartbeat Monitoring**: Automatic health status reporting to the hub
- **Ticket Management**: Submit and view support tickets from within your app
- **System Announcements**: Display maintenance windows, outages, and updates
- **Floating Widget**: Optional UI widget for users to submit tickets and view status

## Installation

1. Copy this entire `mission-control-plugin` folder to your project's `src/lib/` directory

2. Add environment variables to your `.env` file:
   ```env
   VITE_MISSION_CONTROL_API_KEY=your_api_key_here
   VITE_APP_CODE=your_app_code
   VITE_APP_VERSION=1.0.0
   ```

3. Get your API key from the Faith & Harmony Hub admin panel at `/admin/apps`

## Usage

### Basic Setup

Wrap your app with the `MissionControlProvider`:

```tsx
// App.tsx
import { MissionControlProvider, MissionControlWidget } from '@/lib/mission-control-plugin';

function App() {
  return (
    <MissionControlProvider>
      <YourAppContent />
      <MissionControlWidget />
    </MissionControlProvider>
  );
}
```

### Configuration Options

```tsx
<MissionControlProvider
  config={{
    apiKey: 'custom-api-key', // Override env variable
    appCode: 'my-app',
    heartbeatInterval: 60000, // 1 minute (default: 5 minutes)
    debug: true, // Enable console logging
  }}
>
```

### Using the Hook Directly

```tsx
import { useMissionControlContext } from '@/lib/mission-control-plugin';

function MyComponent() {
  const { 
    isConnected, 
    announcements, 
    tickets, 
    actions 
  } = useMissionControlContext();

  const handleSubmitTicket = async () => {
    const result = await actions.submitTicket({
      type: 'bug',
      priority: 'high',
      title: 'Something is broken',
      description: 'Details about the issue...',
    });
    
    if (result.success) {
      console.log('Ticket created:', result.ticket_number);
    }
  };

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Active announcements: {announcements.length}</p>
      <button onClick={handleSubmitTicket}>Report Issue</button>
    </div>
  );
}
```

### Widget Customization

```tsx
<MissionControlWidget
  position="bottom-right"    // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  showAnnouncements={true}   // Show announcement banners
  showTickets={true}         // Show ticket list tab
  allowTicketSubmission={true} // Allow users to submit tickets
/>
```

### Announcements Only (No Widget)

```tsx
import { useMissionControlContext, AnnouncementBanner } from '@/lib/mission-control-plugin';

function AnnouncementsDisplay() {
  const { announcements, actions } = useMissionControlContext();

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {announcements.map(announcement => (
        <AnnouncementBanner
          key={announcement.id}
          announcement={announcement}
          onDismiss={() => actions.dismissAnnouncement(announcement.id)}
        />
      ))}
    </div>
  );
}
```

## API Reference

### MissionControlState

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | boolean | Hub connection status |
| `isLoading` | boolean | Initial loading state |
| `error` | string \| null | Connection error message |
| `announcements` | Announcement[] | Active announcements |
| `tickets` | Ticket[] | User's tickets |
| `lastHeartbeat` | Date \| null | Last successful heartbeat |

### MissionControlActions

| Method | Description |
|--------|-------------|
| `sendHeartbeat()` | Manually trigger a heartbeat |
| `submitTicket(ticket)` | Submit a new support ticket |
| `fetchTickets()` | Refresh tickets list |
| `fetchAnnouncements()` | Refresh announcements |
| `dismissAnnouncement(id)` | Dismiss an announcement |

### Announcement Types

| Type | Color | Use Case |
|------|-------|----------|
| `info` | Blue | General information |
| `warning` | Yellow | Important notices |
| `maintenance` | Orange | Scheduled maintenance |
| `outage` | Red | System outages |
| `resolved` | Green | Issue resolved |

## Security

- API keys are validated server-side using SHA-256 hashing
- Each app can only view its own tickets
- Heartbeats are rate-limited to prevent abuse
- All communications use HTTPS

## Support

For issues with this plugin, contact the Faith & Harmony development team or submit a ticket through the hub admin panel.
