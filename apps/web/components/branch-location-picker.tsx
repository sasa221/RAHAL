"use client";

import { useRef, type PointerEvent } from "react";
import type { PublicLocale } from "../lib/public-content";

const bounds = { north: 31.8, south: 22, east: 36.9, west: 24.7 };

export function BranchLocationPicker({
  locale,
  latitude,
  longitude,
  onChange,
}: {
  locale: PublicLocale;
  latitude: number | null;
  longitude: number | null;
  onChange(latitude: number, longitude: number): void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const setFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = surface.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    onChange(
      Number((bounds.north - y * (bounds.north - bounds.south)).toFixed(7)),
      Number((bounds.west + x * (bounds.east - bounds.west)).toFixed(7)),
    );
  };
  const marker =
    latitude !== null && longitude !== null
      ? {
          left: `${((longitude - bounds.west) / (bounds.east - bounds.west)) * 100}%`,
          top: `${((bounds.north - latitude) / (bounds.north - bounds.south)) * 100}%`,
        }
      : null;
  return (
    <section className="branch-map-picker">
      <header>
        <strong>{locale === "ar" ? "اختار موقع الفرع" : "Choose the branch location"}</strong>
        <span>
          {locale === "ar"
            ? "اضغط أو اسحب العلامة على الخريطة"
            : "Click or drag the marker on the map"}
        </span>
      </header>
      <div
        ref={surface}
        className="branch-map-picker__surface"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPointer(event);
        }}
        role="application"
        aria-label={locale === "ar" ? "خريطة اختيار موقع الفرع" : "Branch location map"}
      >
        <span className="branch-map-picker__nile" aria-hidden="true" />
        <span className="branch-map-picker__cairo">CAIRO</span>
        <span className="branch-map-picker__alex">ALEXANDRIA</span>
        {marker ? (
          <span
            className="branch-map-picker__marker"
            style={marker}
            aria-label={locale === "ar" ? "موقع الفرع المحدد" : "Selected branch location"}
          >
            R
          </span>
        ) : (
          <span className="branch-map-picker__hint">
            {locale === "ar" ? "اضغط لتحديد المكان" : "Click to place the marker"}
          </span>
        )}
      </div>
    </section>
  );
}
