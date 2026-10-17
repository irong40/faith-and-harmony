import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// A fake Supabase client: enough of the query builder for fetchOfficePresence,
// and a channel API that records what the hook created and removed.
const { created, removeChannel } = vi.hoisted(() => ({
  created: [] as { name: string; channel: object }[],
  removeChannel: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const result = { data: [], error: null };
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "gte", "order", "limit", "eq", "maybeSingle", "insert", "single"]) builder[m] = () => builder;
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return {
    supabase: {
      from: () => builder,
      channel: (name: string) => {
        const channel: Record<string, unknown> = { name };
        channel.on = () => channel;
        channel.subscribe = () => channel;
        created.push({ name, channel });
        return channel;
      },
      removeChannel,
    },
  };
});

import { useOfficePresence } from "./useOffice";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

afterEach(() => {
  cleanup();
  created.length = 0;
  removeChannel.mockReset();
});

describe("useOfficePresence realtime channel", () => {
  it("removes exactly the channel it created when it unmounts", () => {
    const { unmount } = renderHook(() => useOfficePresence(), { wrapper });
    expect(created).toHaveLength(1);
    expect(removeChannel).not.toHaveBeenCalled();
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(removeChannel.mock.calls[0][0]).toBe(created[0].channel);
  });

  it("gives every mount its own channel name, so a remount never joins a channel that is leaving", () => {
    const first = renderHook(() => useOfficePresence(), { wrapper });
    first.unmount();
    const second = renderHook(() => useOfficePresence(), { wrapper });
    expect(created).toHaveLength(2);
    expect(created[0].name).not.toBe(created[1].name);
    expect(created[1].name).toMatch(/^office-presence-/);
    second.unmount();
    expect(removeChannel.mock.calls[1][0]).toBe(created[1].channel);
  });
});
