import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { clearAll } from "@/lib/storage";

// Motion's animations rely on requestAnimationFrame, which jsdom does not
// drive. Skip all animations in tests so elements render at their target
// state immediately and AnimatePresence transitions complete synchronously.
MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
  // Reset both localStorage and the in-memory snapshot cache.
  clearAll();
});
