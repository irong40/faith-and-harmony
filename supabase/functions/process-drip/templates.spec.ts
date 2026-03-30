// Process Drip Templates Tests
// Tests for template resolution, HTML helpers, and template registry.
// Pure functions — no external dependencies.

import { assertEquals, assert, assertNotEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { assertStringIncludes } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import {
  getTemplate,
  wrap,
  ctaButton,
  p,
} from './templates.ts';
import type { BrandConfig, TemplateContext } from './templates.ts';

// Shared test fixtures
const testBrand: BrandConfig = {
  navy: '#1C1C1C',
  sky: '#FF6B35',
  accent: '#FF6B35',
  light: '#F5F5F0',
  companyName: 'Test Drone Co',
  tagline: 'Professional Drone Services',
  fromEmail: 'test@example.com',
  replyTo: 'test@example.com',
  phone: '757.555.0000',
  website: 'testdrone.com',
};

const testCtx: TemplateContext = {
  recipient_name: 'Acme Roofing',
  recipient_email: 'boss@acme.com',
  lead_id: 'lead-123',
  context: {},
};

// ---- p() helper ----

Deno.test('p() wraps text in a styled paragraph', () => {
  const result = p('Hello world');
  assertStringIncludes(result, '<p');
  assertStringIncludes(result, 'Hello world');
  assertStringIncludes(result, '</p>');
});

// ---- ctaButton() helper ----

Deno.test('ctaButton() creates a link with brand color', () => {
  const result = ctaButton(testBrand, 'Click Me', 'https://example.com');
  assertStringIncludes(result, 'Click Me');
  assertStringIncludes(result, 'href="https://example.com"');
  assertStringIncludes(result, testBrand.sky);
});

// ---- wrap() helper ----

Deno.test('wrap() includes brand company name in header', () => {
  const result = wrap(testBrand, '<p>Body</p>');
  assertStringIncludes(result, testBrand.companyName);
});

Deno.test('wrap() includes brand tagline', () => {
  const result = wrap(testBrand, '<p>Body</p>');
  assertStringIncludes(result, testBrand.tagline);
});

Deno.test('wrap() includes phone and website in footer', () => {
  const result = wrap(testBrand, '<p>Body</p>');
  assertStringIncludes(result, testBrand.phone);
  assertStringIncludes(result, testBrand.website);
});

Deno.test('wrap() uses brand colors', () => {
  const result = wrap(testBrand, '<p>Body</p>');
  assertStringIncludes(result, testBrand.navy);
  assertStringIncludes(result, testBrand.accent);
});

Deno.test('wrap() includes body content', () => {
  const result = wrap(testBrand, '<p>Custom content here</p>');
  assertStringIncludes(result, 'Custom content here');
});

Deno.test('wrap() produces valid HTML structure', () => {
  const result = wrap(testBrand, '<p>Test</p>');
  assertStringIncludes(result, '<!DOCTYPE html>');
  assertStringIncludes(result, '<html>');
  assertStringIncludes(result, '</html>');
  assertStringIncludes(result, '<body');
  assertStringIncludes(result, '</body>');
});

// ---- getTemplate() registry ----

Deno.test('getTemplate returns null for nonexistent template key', () => {
  const result = getTemplate('nonexistent', 1, testCtx, testBrand);
  assertEquals(result, null);
});

Deno.test('getTemplate returns null for out-of-range step', () => {
  const result = getTemplate('outreach_drip', 99, testCtx, testBrand);
  assertEquals(result, null);
});

Deno.test('getTemplate returns null for step 0', () => {
  const result = getTemplate('outreach_drip', 0, testCtx, testBrand);
  assertEquals(result, null);
});

// ---- outreach_drip templates ----

Deno.test('outreach_drip step 1 returns subject and html', () => {
  const result = getTemplate('outreach_drip', 1, testCtx, testBrand);
  assertNotEquals(result, null);
  assertStringIncludes(result!.subject, 'Acme Roofing');
  assertStringIncludes(result!.html, 'Acme Roofing');
  assertStringIncludes(result!.html, 'Dr. Adam Pierce');
});

Deno.test('outreach_drip step 1 uses service_focus from context', () => {
  const ctx = { ...testCtx, context: { service_focus: 'roof inspections' } };
  const result = getTemplate('outreach_drip', 1, ctx, testBrand);
  assertStringIncludes(result!.html, 'roof inspections');
});

Deno.test('outreach_drip step 1 defaults service_focus when not provided', () => {
  const result = getTemplate('outreach_drip', 1, testCtx, testBrand);
  assertStringIncludes(result!.html, 'aerial inspection and documentation');
});

Deno.test('outreach_drip step 2 mentions sample deliverables', () => {
  const result = getTemplate('outreach_drip', 2, testCtx, testBrand);
  assertNotEquals(result, null);
  assertStringIncludes(result!.html, 'Sample Inspection Report');
});

Deno.test('outreach_drip step 3 includes pricing info', () => {
  const result = getTemplate('outreach_drip', 3, testCtx, testBrand);
  assertNotEquals(result, null);
  assertStringIncludes(result!.html, '$225');
  assertStringIncludes(result!.html, '$450');
});

Deno.test('outreach_drip step 4 does not exist', () => {
  const result = getTemplate('outreach_drip', 4, testCtx, testBrand);
  assertEquals(result, null);
});

// ---- post_delivery templates ----

Deno.test('post_delivery step 1 mentions deliverables ready', () => {
  const result = getTemplate('post_delivery', 1, testCtx, testBrand);
  assertNotEquals(result, null);
  assertStringIncludes(result!.subject, 'deliverables');
  assertStringIncludes(result!.html, 'revisions');
});

Deno.test('post_delivery step 2 asks for feedback', () => {
  const result = getTemplate('post_delivery', 2, testCtx, testBrand);
  assertNotEquals(result, null);
  assertStringIncludes(result!.html, 'image quality');
});

Deno.test('post_delivery step 3 requests a Google review', () => {
  const result = getTemplate('post_delivery', 3, testCtx, testBrand);
  assertNotEquals(result, null);
  assertStringIncludes(result!.html, 'Google');
  assertStringIncludes(result!.html, 'review');
});

Deno.test('post_delivery step 4 mentions retainer option', () => {
  const result = getTemplate('post_delivery', 4, testCtx, testBrand);
  assertNotEquals(result, null);
  assertStringIncludes(result!.html, '$1,500');
  assertStringIncludes(result!.html, 'retainer');
});

Deno.test('post_delivery step 5 does not exist', () => {
  const result = getTemplate('post_delivery', 5, testCtx, testBrand);
  assertEquals(result, null);
});

// ---- vapi_followup templates ----

Deno.test('vapi_followup step 1 thanks for calling', () => {
  const result = getTemplate('vapi_followup', 1, testCtx, testBrand);
  assertNotEquals(result, null);
  assertStringIncludes(result!.subject, 'calling');
  assertStringIncludes(result!.html, 'What Happens Next');
});

Deno.test('vapi_followup step 1 uses service_type from context', () => {
  const ctx = { ...testCtx, context: { service_type: 'construction progress' } };
  const result = getTemplate('vapi_followup', 1, ctx, testBrand);
  assertStringIncludes(result!.html, 'construction progress');
});

Deno.test('vapi_followup step 1 defaults service_type', () => {
  const result = getTemplate('vapi_followup', 1, testCtx, testBrand);
  assertStringIncludes(result!.html, 'drone services');
});

Deno.test('vapi_followup step 2 does not exist', () => {
  const result = getTemplate('vapi_followup', 2, testCtx, testBrand);
  assertEquals(result, null);
});

// ---- Fallback recipient name ----

Deno.test('templates use "there" when recipient_name is empty', () => {
  const ctx: TemplateContext = {
    recipient_name: '',
    recipient_email: 'test@test.com',
    lead_id: 'lead-1',
    context: {},
  };
  const result = getTemplate('outreach_drip', 1, ctx, testBrand);
  assertStringIncludes(result!.html, 'Hi there');
});

// ---- All templates produce valid HTML ----

Deno.test('all 8 templates produce HTML with <body> and </body>', () => {
  const templates: [string, number][] = [
    ['outreach_drip', 1], ['outreach_drip', 2], ['outreach_drip', 3],
    ['post_delivery', 1], ['post_delivery', 2], ['post_delivery', 3], ['post_delivery', 4],
    ['vapi_followup', 1],
  ];

  for (const [type, step] of templates) {
    const result = getTemplate(type, step, testCtx, testBrand);
    assertNotEquals(result, null, `${type}_${step} should exist`);
    assertStringIncludes(result!.html, '<body', `${type}_${step} missing <body>`);
    assertStringIncludes(result!.html, '</body>', `${type}_${step} missing </body>`);
    assert(result!.subject.length > 0, `${type}_${step} subject should not be empty`);
  }
});

// ---- All templates include brand phone ----

Deno.test('all templates include brand phone number in footer', () => {
  const templates: [string, number][] = [
    ['outreach_drip', 1], ['outreach_drip', 2], ['outreach_drip', 3],
    ['post_delivery', 1], ['post_delivery', 2], ['post_delivery', 3], ['post_delivery', 4],
    ['vapi_followup', 1],
  ];

  for (const [type, step] of templates) {
    const result = getTemplate(type, step, testCtx, testBrand)!;
    assertStringIncludes(result.html, testBrand.phone, `${type}_${step} missing phone`);
  }
});
