"use client";

import { useEffect } from "react";

export function ExperienceMotion() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("motion-ready");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

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

    revealItems.forEach((item) => revealObserver.observe(item));

    const updateScrollProgress = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const progress = available > 0 ? Math.min(window.scrollY / available, 1) : 0;
      root.style.setProperty("--page-progress", String(progress));
    };

    const updatePointer = (event: PointerEvent) => {
      if (reducedMotion.matches) return;
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
      root.style.setProperty("--pointer-rx", String(event.clientX / window.innerWidth - 0.5));
      root.style.setProperty("--pointer-ry", String(event.clientY / window.innerHeight - 0.5));
    };

    const tiltItems = finePointer.matches
      ? Array.from(document.querySelectorAll<HTMLElement>("[data-tilt]"))
      : [];
    const tiltCleanups = tiltItems.map((item) => {
      const onMove = (event: PointerEvent) => {
        if (reducedMotion.matches) return;
        const bounds = item.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        item.style.setProperty("--tilt-x", `${(-y * 5).toFixed(2)}deg`);
        item.style.setProperty("--tilt-y", `${(x * 7).toFixed(2)}deg`);
        item.style.setProperty("--shine-x", `${((x + 0.5) * 100).toFixed(1)}%`);
        item.style.setProperty("--shine-y", `${((y + 0.5) * 100).toFixed(1)}%`);
      };
      const onLeave = () => {
        item.style.setProperty("--tilt-x", "0deg");
        item.style.setProperty("--tilt-y", "0deg");
      };

      item.addEventListener("pointermove", onMove);
      item.addEventListener("pointerleave", onLeave);
      return () => {
        item.removeEventListener("pointermove", onMove);
        item.removeEventListener("pointerleave", onLeave);
      };
    });

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });

    return () => {
      root.classList.remove("motion-ready");
      revealObserver.disconnect();
      tiltCleanups.forEach((cleanup) => cleanup());
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, []);

  return (
    <>
      <span className="experience-progress" aria-hidden="true" />
      <span className="experience-glow" aria-hidden="true" />
    </>
  );
}
