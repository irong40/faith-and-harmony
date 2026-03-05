import { describe, it, expect, vi } from 'vitest';

// Test that admin AccessoryFormDialog uses aircraft checkboxes, not freeform text

describe('Admin AccessoryFormDialog aircraft multi-select', () => {
  it('should import useAllAircraft from useFleet hook', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/AccessoryFormDialog.tsx', 'utf-8');
    expect(source).toMatch(/useAllAircraft/);
    expect(source).toMatch(/from\s+['"]@\/hooks\/useFleet['"]/);
  });

  it('should use Checkbox components instead of freeform text input for aircraft', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/AccessoryFormDialog.tsx', 'utf-8');

    // Should use Checkbox component
    expect(source).toMatch(/Checkbox/);

    // Should NOT have the comma-separated text input hint
    expect(source).not.toMatch(/Comma separated model names/);
  });

  it('should store compatible_aircraft as string array, not comma-separated string', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/components/admin/AccessoryFormDialog.tsx', 'utf-8');

    // Form state should use string[] for compatible_aircraft
    expect(source).toMatch(/compatible_aircraft.*string\[\]/);
  });
});
