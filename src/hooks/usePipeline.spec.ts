import { describe, it, expect } from 'vitest';

// ─── Pure logic extracted from usePipeline hooks for testability ───

/**
 * Determines which template source to use:
 * - Direct template ID (covers standalone paths C, D, V, B+C with no package_id)
 * - Package-based lookup (legacy jobs assigned by package)
 */
function resolveTemplateStrategy(
  templateId: string | null | undefined,
  packageId: string | null | undefined,
): { useDirectId: boolean; usePackageLookup: boolean } {
  const hasTemplateId = !!templateId;
  return {
    useDirectId: hasTemplateId,
    usePackageLookup: !hasTemplateId && !!packageId,
  };
}

/**
 * Coalesces two template results (direct ID vs package lookup).
 * Direct ID always takes priority.
 */
function coalesceTemplates<T>(
  templateById: T | null | undefined,
  templateByPkg: T | null | undefined,
): T | null {
  return templateById ?? templateByPkg ?? null;
}

/**
 * Detects conflict response from pipeline-trigger edge function.
 */
function isConflictError(error: { context?: { status?: number }; message?: string }): boolean {
  return error.context?.status === 409 || !!error.message?.includes('409');
}

// ─── Tests ────────────────────────────────────────────────────────

describe('resolveTemplateStrategy', () => {
  it('prefers direct template ID when both are available', () => {
    const result = resolveTemplateStrategy('tmpl-123', 'pkg-456');
    expect(result).toEqual({ useDirectId: true, usePackageLookup: false });
  });

  it('falls back to package lookup when no template ID', () => {
    const result = resolveTemplateStrategy(null, 'pkg-456');
    expect(result).toEqual({ useDirectId: false, usePackageLookup: true });
  });

  it('returns neither when both are null', () => {
    const result = resolveTemplateStrategy(null, null);
    expect(result).toEqual({ useDirectId: false, usePackageLookup: false });
  });

  it('handles undefined inputs', () => {
    const result = resolveTemplateStrategy(undefined, undefined);
    expect(result).toEqual({ useDirectId: false, usePackageLookup: false });
  });

  it('handles empty string template ID as falsy', () => {
    const result = resolveTemplateStrategy('', 'pkg-456');
    expect(result).toEqual({ useDirectId: false, usePackageLookup: true });
  });
});

describe('coalesceTemplates', () => {
  const templateA = { id: 'a', name: 'Path A' };
  const templateC = { id: 'c', name: 'Path C' };

  it('returns direct template when both exist', () => {
    expect(coalesceTemplates(templateA, templateC)).toEqual(templateA);
  });

  it('returns package template when direct is null', () => {
    expect(coalesceTemplates(null, templateC)).toEqual(templateC);
  });

  it('returns direct template when package is null', () => {
    expect(coalesceTemplates(templateA, null)).toEqual(templateA);
  });

  it('returns null when both are null', () => {
    expect(coalesceTemplates(null, null)).toBeNull();
  });

  it('returns null when both are undefined', () => {
    // undefined ?? undefined → undefined, cast to null by the function
    expect(coalesceTemplates(undefined, undefined)).toBeNull();
  });
});

describe('isConflictError', () => {
  it('detects 409 from context.status', () => {
    expect(isConflictError({ context: { status: 409 } })).toBe(true);
  });

  it('detects 409 from error message', () => {
    expect(isConflictError({ message: 'Request failed with status 409' })).toBe(true);
  });

  it('returns false for non-conflict errors', () => {
    expect(isConflictError({ context: { status: 500 }, message: 'Server error' })).toBe(false);
  });

  it('returns false for empty error object', () => {
    expect(isConflictError({})).toBe(false);
  });
});
