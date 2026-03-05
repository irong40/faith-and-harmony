import { describe, it, expect, vi } from 'vitest';

// We test that the useDeleteAccessory mutation function calls rpc('delete_accessory_safe')
// by reading the source and checking the pattern, since we can't easily test hooks without renderHook

describe('useDeleteAccessory RPC integration', () => {
  it('should use supabase.rpc with delete_accessory_safe instead of direct delete', async () => {
    // Read the actual source to verify the RPC call pattern
    const fs = await import('fs');
    const source = fs.readFileSync('src/hooks/useFleetMutations.ts', 'utf-8');

    // Must contain the RPC call
    expect(source).toMatch(/rpc\s*\(\s*['"]delete_accessory_safe['"]/);

    // Must contain p_accessory_id parameter
    expect(source).toMatch(/p_accessory_id/);

    // Should NOT contain direct delete on accessories table in useDeleteAccessory
    // Extract the useDeleteAccessory function block
    const deleteIdx = source.indexOf('useDeleteAccessory');
    const deleteBlock = source.slice(deleteIdx, source.indexOf('// ──', deleteIdx + 1) || undefined);
    expect(deleteBlock).not.toMatch(/from\s*\(\s*['"]accessories['"]\s*\)\s*\.delete/);
  });
});
