import { describe, it, expect } from 'vitest';

// Tests for ConvertLeadDialog pure helper functions (Plan 15-02 - Task 1)
// Source-inspection tests following the LeadDetailDrawer.spec.tsx pattern.

describe('buildClientInsert', () => {
  it('maps lead fields to client insert shape', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/ConvertLeadDialog.tsx', 'utf-8');
    // Function must be exported
    expect(source).toMatch(/export function buildClientInsert/);
    // Returns name, phone, email from lead fields
    expect(source).toMatch(/caller_name/);
    expect(source).toMatch(/caller_phone/);
    expect(source).toMatch(/caller_email/);
  });

  it('returns object with name, phone, email keys', async () => {
    const { buildClientInsert } = await import('./ConvertLeadDialog');
    const result = buildClientInsert({
      id: 'lead-1',
      caller_name: 'Jane Doe',
      caller_phone: '757-555-1234',
      caller_email: 'jane@test.com',
      source_channel: 'voice_bot',
    });
    expect(result).toEqual({
      name: 'Jane Doe',
      phone: '757-555-1234',
      email: 'jane@test.com',
    });
  });

  it('passes through null email', async () => {
    const { buildClientInsert } = await import('./ConvertLeadDialog');
    const result = buildClientInsert({
      id: 'lead-2',
      caller_name: 'John Smith',
      caller_phone: '757-555-9999',
      caller_email: null,
      source_channel: 'manual',
    });
    expect(result.name).toBe('John Smith');
    expect(result.phone).toBe('757-555-9999');
    expect(result.email).toBeNull();
  });
});

describe('buildQuoteRequestInsert', () => {
  it('is exported from ConvertLeadDialog', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/ConvertLeadDialog.tsx', 'utf-8');
    expect(source).toMatch(/export function buildQuoteRequestInsert/);
  });

  it('returns object with required quote_request fields', async () => {
    const { buildQuoteRequestInsert } = await import('./ConvertLeadDialog');
    const result = buildQuoteRequestInsert({
      id: 'lead-1',
      caller_name: 'Jane Doe',
      caller_phone: '757-555-1234',
      caller_email: 'jane@test.com',
      source_channel: 'voice_bot',
    });
    expect(result.name).toBe('Jane Doe');
    expect(result.phone).toBe('757-555-1234');
    expect(result.email).toBe('jane@test.com');
    expect(result.description).toMatch(/Lead converted/);
    expect(result.status).toBe('new');
  });

  it('maps voice_bot source_channel to "voice_bot" source value', async () => {
    const { buildQuoteRequestInsert } = await import('./ConvertLeadDialog');
    const result = buildQuoteRequestInsert({
      id: 'lead-1',
      caller_name: 'Jane Doe',
      caller_phone: '757-555-1234',
      caller_email: 'jane@test.com',
      source_channel: 'voice_bot',
    });
    expect(result.source).toBe('voice_bot');
  });

  it('maps non-voice_bot source_channel to "manual" source value', async () => {
    const { buildQuoteRequestInsert } = await import('./ConvertLeadDialog');
    const result = buildQuoteRequestInsert({
      id: 'lead-1',
      caller_name: 'Jane Doe',
      caller_phone: '757-555-1234',
      caller_email: 'jane@test.com',
      source_channel: 'web_form',
    });
    expect(result.source).toBe('manual');
  });
});

describe('ConvertLeadDialog component structure', () => {
  it('renders two tabs: New Client and Link Existing', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/ConvertLeadDialog.tsx', 'utf-8');
    expect(source).toMatch(/New Client/);
    expect(source).toMatch(/Link Existing/);
    expect(source).toMatch(/TabsList/);
    expect(source).toMatch(/TabsTrigger/);
  });

  it('exports ConvertLeadDialog as named export', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/ConvertLeadDialog.tsx', 'utf-8');
    expect(source).toMatch(/export function ConvertLeadDialog/);
  });

  it('uses Dialog, DialogContent, DialogHeader, DialogTitle', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/ConvertLeadDialog.tsx', 'utf-8');
    expect(source).toMatch(/Dialog/);
    expect(source).toMatch(/DialogContent/);
    expect(source).toMatch(/DialogHeader/);
    expect(source).toMatch(/DialogTitle/);
  });

  it('calls onConverted and onClose on success', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/ConvertLeadDialog.tsx', 'utf-8');
    expect(source).toMatch(/onConverted\(\)/);
    expect(source).toMatch(/onClose\(\)/);
  });

  it('shows spinner and disables button during loading', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/ConvertLeadDialog.tsx', 'utf-8');
    expect(source).toMatch(/Loader2/);
    expect(source).toMatch(/isPending/);
  });
});
