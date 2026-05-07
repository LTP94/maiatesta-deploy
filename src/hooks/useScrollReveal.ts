import { useEffect } from "react";

export function useScrollReveal(dependency: unknown) {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".scroll-reveal"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        // Large positive rootMargin so elements trigger well before they enter view.
        // This prevents fast-scroll from leaving elements invisible.
        rootMargin: "0px 0px 30% 0px",
        threshold: 0,
      },
    );

    elements.forEach((element, index) => {
      element.style.setProperty("--reveal-index", String(index % 5));

      // Immediately reveal elements already in (or near) the viewport.
      // This is the primary fix for fast-scroll: if the user scrolls past
      // a section before the observer fires, the element is already visible.
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.1 && rect.bottom > -window.innerHeight * 0.1) {
        element.classList.add("is-visible");
      } else {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [dependency]);
}
