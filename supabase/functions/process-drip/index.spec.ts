// Process Drip Edge Function Tests
// Tests for pure logic: skip conditions, tracking pixel injection, and batch limit.
// No database or Resend dependency — tests extracted functions only.

import { assertEquals, assert, assertNotEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import {
  BATCH_LIMIT,
  shouldSkipEmail,
  injectTrackingPixel,
} from './index.ts';

// ---- BATCH_LIMIT ----

Deno.test('BATCH_LIMIT is 20', () => {
  assertEquals(BATCH_LIMIT, 20);
});

// ---- shouldSkipEmail ----

Deno.test('shouldSkipEmail returns null for outreach_drip with new lead', () => {
  const result = shouldSkipEmail('outreach_drip', 'new', false);
  assertEquals(result, null);
});

Deno.test('shouldSkipEmail returns null for outreach_drip with contacted lead', () => {
  const result = shouldSkipEmail('outreach_drip', 'contacted', false);
  assertEquals(result, null);
});

Deno.test('shouldSkipEmail returns skip reason when outreach lead is already a client', () => {
  const result = shouldSkipEmail('outreach_drip', 'client', false);
  assertNotEquals(result, null);
  assert(result!.includes('client'));
});

Deno.test('shouldSkipEmail returns skip reason when outreach lead marked not interested', () => {
  const result = shouldSkipEmail('outreach_drip', 'contacted', true);
  assertNotEquals(result, null);
  assert(result!.includes('not interested'));
});

Deno.test('shouldSkipEmail skips client check before not-interested check', () => {
  // Both conditions true — client takes priority
  const result = shouldSkipEmail('outreach_drip', 'client', true);
  assert(result!.includes('client'));
});

Deno.test('shouldSkipEmail does NOT skip post_delivery even if lead is a client', () => {
  const result = shouldSkipEmail('post_delivery', 'client', false);
  assertEquals(result, null);
});

Deno.test('shouldSkipEmail does NOT skip post_delivery even if not interested', () => {
  const result = shouldSkipEmail('post_delivery', 'contacted', true);
  assertEquals(result, null);
});

Deno.test('shouldSkipEmail does NOT skip vapi_followup even if lead is a client', () => {
  const result = shouldSkipEmail('vapi_followup', 'client', false);
  assertEquals(result, null);
});

Deno.test('shouldSkipEmail handles null lead status', () => {
  const result = shouldSkipEmail('outreach_drip', null, false);
  assertEquals(result, null);
});

// ---- injectTrackingPixel ----

Deno.test('injectTrackingPixel inserts pixel before </body>', () => {
  const html = '<html><body><p>Hello</p></body></html>';
  const result = injectTrackingPixel(html, 'track-abc', 'https://example.supabase.co');
  assert(result.includes('<img src="https://example.supabase.co/functions/v1/track-email?t=track-abc&a=open"'));
  assert(result.includes('width="1" height="1"'));
  assert(result.includes('style="display:none;"'));
  assert(result.endsWith('</body></html>'));
});

Deno.test('injectTrackingPixel preserves original HTML content', () => {
  const html = '<html><body><p>Content here</p></body></html>';
  const result = injectTrackingPixel(html, 'xyz', 'https://sb.co');
  assert(result.includes('<p>Content here</p>'));
});

Deno.test('injectTrackingPixel returns original HTML if no </body> tag', () => {
  const html = '<html><p>No body tag</p></html>';
  const result = injectTrackingPixel(html, 'xyz', 'https://sb.co');
  assertEquals(result, html);
});

Deno.test('injectTrackingPixel uses correct URL format', () => {
  const result = injectTrackingPixel(
    '<body></body>',
    'my-tracking-id',
    'https://cwaxhfmstlkxqpuhbrbv.supabase.co',
  );
  assert(result.includes('https://cwaxhfmstlkxqpuhbrbv.supabase.co/functions/v1/track-email?t=my-tracking-id&a=open'));
});
