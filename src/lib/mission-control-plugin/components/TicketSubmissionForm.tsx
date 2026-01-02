import React, { useState } from 'react';
import type { TicketSubmission } from '../hooks/useMissionControl';

interface TicketSubmissionFormProps {
  onSubmit: (ticket: TicketSubmission) => Promise<{ success: boolean; ticket_number?: string; error?: string }>;
}

export function TicketSubmissionForm({ onSubmit }: TicketSubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [formData, setFormData] = useState<TicketSubmission>({
    type: 'bug',
    priority: 'medium',
    title: '',
    description: '',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await onSubmit(formData);
      
      if (response.success) {
        setResult({
          success: true,
          message: `Ticket ${response.ticket_number} created successfully!`,
        });
        // Reset form
        setFormData({
          type: 'bug',
          priority: 'medium',
          title: '',
          description: '',
          steps_to_reproduce: '',
          expected_behavior: '',
          actual_behavior: '',
        });
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to submit ticket',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result && (
        <div
          className={`p-3 rounded-md text-sm ${
            result.success
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as TicketSubmission['type'] })}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="maintenance">Maintenance</option>
            <option value="question">Question</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketSubmission['priority'] })}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          placeholder="Brief summary of the issue"
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          rows={3}
          placeholder="Detailed description of the issue or request"
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {formData.type === 'bug' && (
        <>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Steps to Reproduce
            </label>
            <textarea
              value={formData.steps_to_reproduce || ''}
              onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
              rows={2}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Expected
              </label>
              <textarea
                value={formData.expected_behavior || ''}
                onChange={(e) => setFormData({ ...formData, expected_behavior: e.target.value })}
                rows={2}
                placeholder="What should happen"
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Actual
              </label>
              <textarea
                value={formData.actual_behavior || ''}
                onChange={(e) => setFormData({ ...formData, actual_behavior: e.target.value })}
                rows={2}
                placeholder="What actually happens"
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !formData.title || !formData.description}
        className="w-full px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
      </button>
    </form>
  );
}
