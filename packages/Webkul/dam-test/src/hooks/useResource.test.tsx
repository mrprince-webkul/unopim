import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { useResource } from "./useResource";

vi.mock("axios");
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("useResource", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns server data from res.data.data on success", async () => {
    (axios.get as any).mockResolvedValue({ data: { data: [{ id: 1 }] } });
    const { result } = renderHook(() => useResource(["k"], "http://x", { fallback: [] as any[] }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([{ id: 1 }]);
    expect(result.current.usingFallback).toBe(false);
  });

  it("falls back when server returns empty array", async () => {
    (axios.get as any).mockResolvedValue({ data: { data: [] } });
    const fb = [{ id: 99 }];
    const { result } = renderHook(() => useResource(["k2"], "http://x", { fallback: fb }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(fb);
    expect(result.current.usingFallback).toBe(true);
  });

  it("falls back when server returns empty object", async () => {
    (axios.get as any).mockResolvedValue({ data: { data: {} } });
    const fb = { id: 42 };
    const { result } = renderHook(() => useResource(["k5"], "http://x", { fallback: fb }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(fb);
    expect(result.current.usingFallback).toBe(true);
  });

  it("falls back on network error", async () => {
    (axios.get as any).mockRejectedValue(new Error("boom"));
    const fb = [{ id: 7 }];
    const { result } = renderHook(() => useResource(["k3"], "http://x", { fallback: fb }), { wrapper });
    await waitFor(() => expect(result.current.isError || result.current.usingFallback).toBe(true));
    expect(result.current.data).toEqual(fb);
  });

  it("uses fallback immediately when url is undefined", () => {
    const fb = [{ id: 5 }];
    const { result } = renderHook(() => useResource(["k4"], undefined, { fallback: fb }), { wrapper });
    expect(result.current.data).toEqual(fb);
    expect(result.current.usingFallback).toBe(true);
  });
});
