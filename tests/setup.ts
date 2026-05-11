import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { clearAll } from "@/lib/storage";

afterEach(() => {
  cleanup();
  // Reset both localStorage and the in-memory snapshot cache.
  clearAll();
});
