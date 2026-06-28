"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the page is scrolling down (past `threshold`), false when
 * scrolling up or near the top — for hide-on-scroll-down / reveal-on-up headers.
 */
export function useScrollHide(threshold = 80): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    function update() {
      const y = window.scrollY;
      if (y < threshold) setHidden(false);
      else if (y > lastY + 6) setHidden(true);
      else if (y < lastY - 6) setHidden(false);
      lastY = y;
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}
