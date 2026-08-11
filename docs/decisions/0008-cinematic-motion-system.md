# ADR 0008: Cinematic motion with an isolated, lazy 3D studio

## Status

Accepted for the current Rahal visual-experience milestone.

## Context

Rahal needs a premium automotive identity across public, customer, sales, and administrator
surfaces. The raster media library remains the production-safe baseline. The primary vehicle model
was supplied from CGTrader model 7427717 under its Royalty Free License (no AI). The licence permits
incorporation in an application but requires commercially reasonable measures that prevent direct
end-user access to the source model. A second W206 file remains local-only because its source and
licence have not been supplied. The reservation, authentication, and operational workspaces must
remain responsive on lower-powered phones and accessible when reduced motion is requested.

## Decision

- Use CSS transforms, compositing, and one request-animation-frame scroll coordinator for camera,
  parallax, reflection, depth, and progress effects.
- Use IntersectionObserver for one-time reveals and pause continuous decorative motion unless the
  user is actively scrolling or the element is relevant.
- Give the public journey the strongest motion hierarchy. Keep customer workflows measured and
  keep staff workspaces calm, using motion only for state, focus, and hierarchy.
- Provide separate touch behavior rather than shrinking desktop pointer effects.
- Isolate Three.js/WebGL to the public-home hero as a non-interactive cinematic layer. Keep a clean
  raster museum scene as the complete fallback, defer the runtime until the document has loaded and
  the browser is idle, stop the render loop while offscreen, cap device pixel ratio, and never make
  booking behavior depend on the scene.
- Render at display cadence while the user scrolls and while smoke particles decay, then stop the
  loop at rest. Keep realtime WebGL shadows and multisample antialiasing disabled, cap pixel density
  close to one device pixel, and use fewer smoke sprites on the simplified mesh so mobile performance
  does not depend on desktop GPU capacity. Let the CSS-composited ground treatment provide depth.
- Package the licensed production model in Rahal's encrypted asset format rather than publishing a
  directly downloadable GLB. Replace the source logo and number plate materials before rendering so
  the experience does not present third-party brand marks. Encryption is a practical deterrent for
  an open web client, not a claim of unbreakable DRM.
- Keep any model without a recorded source and licence outside public assets and deployment.
- Do not add GSAP while the required effects remain small and expressible through the platform
  animation APIs. Reconsider it only when a reviewed multi-scene pinned narrative needs timeline
  orchestration that the current coordinator cannot express clearly.

## Consequences

- The server-rendered hero remains immediately complete; Three.js and the model load afterward as a
  progressive visual enhancement.
- Vehicle imagery keeps a static fallback when WebGL, the model, or the device is unsuitable.
- Reduced-motion users retain every action with static hierarchy.
- The production scene does not change booking or API behavior, and every future model remains
  explicitly source- and licence-gated.

## Recorded source

- CGTrader model 7427717: `https://www.cgtrader.com/free-3d-models/car/sport-car/bmw-x4-m40i-d37e52fc-45d8-4a92-8122-4c712bd394a3`
- CGTrader General Terms and Conditions, sections 20.3 and 21A, reviewed 2026-08-11.
