import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { clearAll } from "@/lib/storage";

// Complete motion animations instantly so enter/exit transitions don't
// leave elements lingering in the DOM between assertions.
MotionGlobalConfig.skipAnimations = true;

// jsdom doesn't implement matchMedia; motion queries it for
// prefers-reduced-motion.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

afterEach(() => {
  cleanup();
  // Reset both localStorage and the in-memory snapshot cache.
  clearAll();
});
