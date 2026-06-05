import type { Transition, Variants } from "motion/react";

/** Default spring for moving things into place (nav pill, list reflow). */
export const spring: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 40,
};

/** Softer spring for larger surfaces like the study card. */
export const springGentle: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 30,
};

/** Stagger container: children using `fadeUp` animate in one after another. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

/** Pop-in for celebratory elements (session-complete check). */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 18 },
  },
};
