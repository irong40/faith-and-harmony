import React, { useState } from 'react';
import { useMissionControlContext } from './MissionControlProvider';
import { TicketSubmissionForm } from './TicketSubmissionForm';
import { TicketList } from './TicketList';
import { AnnouncementBanner } from './AnnouncementBanner';

interface MissionControlWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showAnnouncements?: boolean;
  showTickets?: boolean;
  allowTicketSubmission?: boolean;
}

export function MissionControlWidget({
  position = 'bottom-right',
  showAnnouncements = true,
  showTickets = true,
  allowTicketSubmission = true,
}: MissionControlWidgetProps) {
  const { isConnected, announcements, tickets, actions } = useMissionControlContext();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tickets' | 'submit'>('tickets');

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <>
      {/* Announcement Banners */}
      {showAnnouncements && announcements.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 space-y-1">
          {announcements.map(announcement => (
            <AnnouncementBanner
              key={announcement.id}
              announcement={announcement}
              onDismiss={() => actions.dismissAnnouncement(announcement.id)}
            />
          ))}
        </div>
      )}

      {/* Floating Widget Button */}
      <div className={`fixed ${positionClasses[position]} z-40`}>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all"
            aria-label="Open Mission Control"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            {/* Connection status indicator */}
            <span
              className={`absolute top-0 right-0 w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </button>
        )}

        {/* Expanded Widget Panel */}
        {isOpen && (
          <div className="w-96 max-h-[600px] bg-background border border-border rounded-lg shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <h3 className="font-semibold text-foreground">Mission Control</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            {(showTickets || allowTicketSubmission) && (
              <div className="flex border-b border-border">
                {showTickets && (
                  <button
                    onClick={() => setActiveTab('tickets')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'tickets'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    My Tickets ({tickets.length})
                  </button>
                )}
                {allowTicketSubmission && (
                  <button
                    onClick={() => setActiveTab('submit')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'submit'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Submit Ticket
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {activeTab === 'tickets' && showTickets && (
                <TicketList
                  tickets={tickets}
                  onRefresh={actions.fetchTickets}
                />
              )}
              {activeTab === 'submit' && allowTicketSubmission && (
                <TicketSubmissionForm
                  onSubmit={async (ticket) => {
                    const result = await actions.submitTicket(ticket);
                    if (result.success) {
                      setActiveTab('tickets');
                    }
                    return result;
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
