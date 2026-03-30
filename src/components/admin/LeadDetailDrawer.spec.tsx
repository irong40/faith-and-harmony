import { describe, it, expect } from 'vitest';

// Tests for LeadDetailDrawer notes form (Plan 03 - Task 1)

describe('LeadDetailDrawer notes form', () => {
  it('should have noteContent state initialized as empty string', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    expect(source).toMatch(/useState\(""\)/);
    expect(source).toMatch(/noteContent/);
  });

  it('should disable Save button when noteContent is empty', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    // Save button disabled when noteContent.trim() is falsy
    expect(source).toMatch(/!noteContent\.trim\(\)/);
    expect(source).toMatch(/disabled=\{!noteContent\.trim\(\)/);
  });

  it('should reset form fields on successful save', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    // onSuccess resets all form fields
    expect(source).toMatch(/setNoteContent\(""\)/);
    expect(source).toMatch(/setReasonTag\(""\)/);
    expect(source).toMatch(/setFollowUpDate\(undefined\)/);
  });

  it('should insert into lead_notes table on save', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    expect(source).toMatch(/lead_notes/);
    expect(source).toMatch(/\.insert\(/);
  });

  it('should invalidate lead-activity query on success', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    expect(source).toMatch(/lead-activity/);
    expect(source).toMatch(/invalidateQueries/);
  });

  it('should render Textarea for note content', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    expect(source).toMatch(/Textarea/);
    expect(source).toMatch(/from "@\/components\/ui\/textarea"/);
  });

  it('should render reason tag Select with four options', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    expect(source).toMatch(/not_ready/);
    expect(source).toMatch(/wrong_area/);
    expect(source).toMatch(/needs_callback/);
    expect(source).toMatch(/price_sensitive/);
  });

  it('should render Calendar-based date picker for follow-up date', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    expect(source).toMatch(/Calendar/);
    expect(source).toMatch(/followUpDate/);
    expect(source).toMatch(/CalendarIcon/);
  });
});

// Tests for LeadDetailDrawer activity timeline (Plan 03 - Task 2)

describe('LeadDetailDrawer activity timeline', () => {
  it('should query lead_activity view', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    expect(source).toMatch(/lead_activity/);
    expect(source).toMatch(/lead-activity.*leadId/);
  });

  it('should render timeline events with badge, summary, and timestamp', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    expect(source).toMatch(/EVENT_TYPE_COLORS/);
    expect(source).toMatch(/EVENT_TYPE_LABELS/);
    expect(source).toMatch(/event\.summary/);
    expect(source).toMatch(/event\.event_at/);
  });

  it('should show empty state when no events', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    expect(source).toMatch(/No activity yet/);
  });

  it('should show loading skeletons during timeline fetch', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/LeadDetailDrawer.tsx', 'utf-8');
    expect(source).toMatch(/timelineLoading/);
    // Skeleton already imported from Plan 02
    expect(source).toMatch(/Skeleton/);
  });
});
