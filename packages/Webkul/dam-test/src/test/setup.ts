import "@testing-library/jest-dom";
import { vi } from "vitest";
// jsdom lacks matchMedia (theme-provider + reduced-motion use it)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() }),
});
