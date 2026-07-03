import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import axios from "axios";
import { toast } from "sonner";
import { useContactSubmit } from "./useContactSubmit";
vi.mock("axios");
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("useContactSubmit", () => {
  beforeEach(() => vi.resetAllMocks());
  it("posts payload and resolves on success", async () => {
    (axios.post as any).mockResolvedValue({ data: { message: "ok" } });
    const { result } = renderHook(() => useContactSubmit());
    const payload = { name: "P", email: "p@x.com", phone: "1", subject: "hi", message: "yo" };
    await act(async () => { await result.current.submit(payload); });
    expect(axios.post).toHaveBeenCalledWith(expect.anything(), payload);
  });

  it("shows toast.success with the server-provided message on success", async () => {
    (axios.post as any).mockResolvedValue({ data: { message: "Custom OK" } });
    const { result } = renderHook(() => useContactSubmit());
    const payload = { name: "P", email: "p@x.com", phone: "1", subject: "hi", message: "yo" };
    await act(async () => { await result.current.submit(payload); });
    expect(toast.success).toHaveBeenCalledWith("Custom OK");
  });

  it("shows toast.error and resets isSubmitting on a rejected request", async () => {
    (axios.post as any).mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useContactSubmit());
    const payload = { name: "P", email: "p@x.com", phone: "1", subject: "hi", message: "yo" };
    await act(async () => { await result.current.submit(payload); });
    expect(toast.error).toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });
});
