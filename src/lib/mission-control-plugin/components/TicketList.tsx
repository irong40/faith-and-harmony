import React from 'react';
import type { Ticket } from '../hooks/useMissionControl';

interface TicketListProps {
  tickets: Ticket[];
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400',
};

const priorityColors: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
};

export function TicketList({ tickets, onRefresh }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto text-muted-foreground mb-3"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
        <p className="text-muted-foreground text-sm">No tickets yet</p>
        <p className="text-muted-foreground text-xs mt-1">
          Submit a ticket to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onRefresh}
          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Refresh
        </button>
      </div>

      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground truncate">
                {ticket.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ticket.ticket_number}
              </p>
            </div>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                statusColors[ticket.status] || statusColors.open
              }`}
            >
              {ticket.status}
            </span>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {ticket.description}
          </p>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                {ticket.type}
              </span>
              <span className={priorityColors[ticket.priority] || priorityColors.medium}>
                {ticket.priority}
              </span>
            </div>
            <span className="text-muted-foreground">
              {new Date(ticket.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
