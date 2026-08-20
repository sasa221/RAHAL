"use client";

import { useEffect } from "react";

const revealSelector = [
  "[data-reveal]",
  ".portal-overview > *",
  ".portal-metrics > article",
  ".portal-stage .sales-layout > *",
  ".portal-stage .customer-requests-layout > *",
  ".customer-drafts-studio > *",
  ".communications-workspace > *",
  ".admin-reports-workspace > *",
  ".portal-stage main > *",
  ".portal-stage main section",
  ".portal-stage main article",
  ".public-site main > section",
  ".public-site main article",
  ".auth-stage > *",
  ".reservation-page__intro",
  ".reservation-form > *",
  ".information-chapters > *",
].join(",");

const depthSelector = [
  "[data-tilt]",
  ".vehicle-card",
  ".category-card",
  ".portal-metrics > article",
  ".public-reviews-grid > article",
  ".customer-draft-card",
  ".fleet-listing-card",
  ".specification-grid > article",
].join(",");

const scrollSceneSelector = "[data-scroll-scene]";

export function ExperienceMotion() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("motion-ready");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const observedRevealItems = new WeakSet<HTMLElement>();
    const depthItems = new WeakSet<HTMLElement>();
    const scrollScenes = new Set<HTMLElement>();

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 },
    );

    const observeRevealItem = (item: HTMLElement) => {
      if (observedRevealItems.has(item)) return;
      observedRevealItems.add(item);
      item.classList.add("rahal-motion-reveal");
      if (reducedMotion.matches) {
        item.classList.add("is-visible");
        return;
      }
      revealObserver.observe(item);
    };

    const observeRevealTree = (node: Node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(revealSelector)) observeRevealItem(node);
      node.querySelectorAll<HTMLElement>(revealSelector).forEach(observeRevealItem);
      if (node.matches(depthSelector)) prepareDepthItem(node);
      node.querySelectorAll<HTMLElement>(depthSelector).forEach(prepareDepthItem);
      if (node.matches(scrollSceneSelector)) scrollScenes.add(node);
      node
        .querySelectorAll<HTMLElement>(scrollSceneSelector)
        .forEach((item) => scrollScenes.add(item));
    };

    const prepareDepthItem = (item: HTMLElement) => {
      if (depthItems.has(item)) return;
      depthItems.add(item);
      item.classList.add("rahal-motion-depth");
      if (!finePointer.matches && !reducedMotion.matches) item.classList.add("rahal-motion-float");
    };

    document.querySelectorAll<HTMLElement>(revealSelector).forEach(observeRevealItem);
    document.querySelectorAll<HTMLElement>(depthSelector).forEach(prepareDepthItem);
    document
      .querySelectorAll<HTMLElement>(scrollSceneSelector)
      .forEach((item) => scrollScenes.add(item));

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach(observeRevealTree));
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    let scrollFrame: number | undefined;
    let scrollSettledTimer: number | undefined;

    const renderScrollState = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const progress = available > 0 ? Math.min(window.scrollY / available, 1) : 0;
      root.style.setProperty("--page-progress", String(progress));
      root.style.setProperty("--scroll-y", `${window.scrollY}px`);

      scrollScenes.forEach((scene) => {
        if (!scene.isConnected) {
          scrollScenes.delete(scene);
          return;
        }
        const bounds = scene.getBoundingClientRect();
        if (bounds.bottom < -window.innerHeight || bounds.top > window.innerHeight * 2) return;
        const journey = (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height);
        scene.style.setProperty("--scene-progress", String(Math.min(Math.max(journey, 0), 1)));
      });
      scrollFrame = undefined;
    };

    const updateScrollProgress = () => {
      root.classList.add("rahal-is-driving");
      if (scrollFrame === undefined) scrollFrame = window.requestAnimationFrame(renderScrollState);
      if (scrollSettledTimer !== undefined) window.clearTimeout(scrollSettledTimer);
      scrollSettledTimer = window.setTimeout(() => root.classList.remove("rahal-is-driving"), 140);
    };

    const updatePointer = (event: PointerEvent) => {
      if (reducedMotion.matches) return;
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
      root.style.setProperty("--pointer-rx", String(event.clientX / window.innerWidth - 0.5));
      root.style.setProperty("--pointer-ry", String(event.clientY / window.innerHeight - 0.5));
    };

    const findDepthItem = (event: PointerEvent) =>
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(".rahal-motion-depth")
        : null;

    const updateDepth = (event: PointerEvent) => {
      if (reducedMotion.matches || !finePointer.matches) return;
      const item = findDepthItem(event);
      if (!item) return;
      const bounds = item.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      item.style.setProperty("--tilt-x", `${(-y * 4.5).toFixed(2)}deg`);
      item.style.setProperty("--tilt-y", `${(x * 6).toFixed(2)}deg`);
      item.style.setProperty("--shine-x", `${((x + 0.5) * 100).toFixed(1)}%`);
      item.style.setProperty("--shine-y", `${((y + 0.5) * 100).toFixed(1)}%`);
    };

    const resetDepth = (event: PointerEvent) => {
      const item = findDepthItem(event);
      if (!item || (event.relatedTarget instanceof Node && item.contains(event.relatedTarget)))
        return;
      item.style.setProperty("--tilt-x", "0deg");
      item.style.setProperty("--tilt-y", "0deg");
    };

    const updateMagnet = (event: PointerEvent) => {
      if (reducedMotion.matches || !finePointer.matches || !(event.target instanceof Element))
        return;
      const item = event.target.closest<HTMLElement>(
        ".button, .fleet-listing-card__link, .text-link, .footer-statement > a",
      );
      if (!item) return;
      const bounds = item.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 7;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 5;
      item.style.setProperty("--magnet-x", `${x.toFixed(2)}px`);
      item.style.setProperty("--magnet-y", `${y.toFixed(2)}px`);
    };

    const resetMagnet = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const item = event.target.closest<HTMLElement>(
        ".button, .fleet-listing-card__link, .text-link, .footer-statement > a",
      );
      if (!item || (event.relatedTarget instanceof Node && item.contains(event.relatedTarget)))
        return;
      item.style.removeProperty("--magnet-x");
      item.style.removeProperty("--magnet-y");
    };

    const beginRouteTransition = (event: MouseEvent) => {
      if (
        reducedMotion.matches ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;

      event.preventDefault();
      root.classList.add("rahal-route-leaving");
      window.setTimeout(() => window.location.assign(destination.href), 190);
    };

    renderScrollState();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });
    document.addEventListener("pointermove", updateDepth, { passive: true });
    document.addEventListener("pointerout", resetDepth, { passive: true });
    document.addEventListener("pointermove", updateMagnet, { passive: true });
    document.addEventListener("pointerout", resetMagnet, { passive: true });
    document.addEventListener("click", beginRouteTransition);

    return () => {
      root.classList.remove("motion-ready");
      revealObserver.disconnect();
      mutationObserver.disconnect();
      if (scrollFrame !== undefined) window.cancelAnimationFrame(scrollFrame);
      if (scrollSettledTimer !== undefined) window.clearTimeout(scrollSettledTimer);
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("pointermove", updatePointer);
      document.removeEventListener("pointermove", updateDepth);
      document.removeEventListener("pointerout", resetDepth);
      document.removeEventListener("pointermove", updateMagnet);
      document.removeEventListener("pointerout", resetMagnet);
      document.removeEventListener("click", beginRouteTransition);
    };
  }, []);

  return (
    <>
      <span className="experience-progress" aria-hidden="true" />
      <span className="experience-glow" aria-hidden="true" />
      <span className="experience-route-veil" aria-hidden="true" />
    </>
  );
}
