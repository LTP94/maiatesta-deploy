import { useEffect } from "react";

export function useScrollReveal(dependency: unknown) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let revealIndex = 0;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          intersectionObserver.unobserve(entry.target);
        });
      },
      {
        // Large positive rootMargin so elements trigger well before they enter view.
        // This prevents fast-scroll from leaving elements invisible.
        rootMargin: "0px 0px 30% 0px",
        threshold: 0,
      },
    );

    // Process a single .scroll-reveal element — called for both initial and lazy-loaded elements.
    const processElement = (element: HTMLElement) => {
      // Guard: skip if already handled so MutationObserver re-fires don't double-process.
      if (element.dataset.revealReady) return;
      element.dataset.revealReady = "1";

      if (reducedMotion) {
        element.classList.add("is-visible");
        return;
      }

      element.style.setProperty("--reveal-index", String(revealIndex % 5));
      revealIndex += 1;

      // Immediately reveal elements already in (or near) the viewport.
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.1 && rect.bottom > -window.innerHeight * 0.1) {
        element.classList.add("is-visible");
      } else {
        intersectionObserver.observe(element);
      }
    };

    // Handle elements already in the DOM (hero + any above-fold content).
    document.querySelectorAll<HTMLElement>(".scroll-reveal").forEach(processElement);

    // Watch for .scroll-reveal elements injected by lazy-loaded chunks.
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          // The added node itself might be a reveal element.
          if (node.classList.contains("scroll-reveal")) processElement(node);
          // Or it may contain reveal elements as descendants.
          node.querySelectorAll<HTMLElement>(".scroll-reveal").forEach(processElement);
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [dependency]);
}
