"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicLocale } from "../lib/public-content";

type DriveState = "idle" | "loading" | "ready" | "fallback";

async function loadProtectedModel(loader: {
  parseAsync: (data: ArrayBuffer, path: string) => Promise<{ scene: import("three").Group }>;
}) {
  const response = await fetch("/models/rahal-drive-scene.rahal3d", {
    cache: "force-cache",
  });
  if (!response.ok) throw new Error("The cinematic vehicle could not be loaded.");

  const packed = new Uint8Array(await response.arrayBuffer());
  const signature = new TextDecoder().decode(packed.slice(0, 6));
  if (signature !== "RHL3D1") throw new Error("Invalid protected vehicle asset.");

  const keyParts = ["RAHAL", "cinematic", "Egypt", "drive", "2026"];
  const keyBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(keyParts.join(":")),
  );
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt(
    { iv: packed.slice(6, 18), name: "AES-GCM" },
    key,
    packed.slice(18),
  );

  return loader.parseAsync(decrypted, "");
}

export function CinematicDriveCar({ locale }: { locale: PublicLocale }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<DriveState>("idle");

  useEffect(() => {
    const host = hostRef.current;
    const sceneElement = host?.closest<HTMLElement>("main");
    if (!host || !sceneElement) return;

    let disposed = false;
    let started = false;
    let visible = true;
    let animationFrame: number | undefined;
    let idleHandle: number | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    const idleWindow = window as Window & {
      cancelIdleCallback?: (handle: number) => void;
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    };
    let activeUntil = 0;
    let cleanupScene: (() => void) | undefined;
    let resumeScene: (() => void) | undefined;

    const start = async () => {
      if (started || disposed) return;
      started = true;
      setState("loading");

      try {
        const [THREE, loaderModule] = await Promise.all([
          import("three"),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
        ]);
        if (disposed) return;

        const canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        host.appendChild(canvas);

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: false,
          canvas,
          powerPreference: "high-performance",
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.86;
        renderer.shadowMap.enabled = false;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
        camera.position.set(0, 1.55, 6.7);

        scene.add(new THREE.HemisphereLight(0xf2f5fb, 0x111827, 1.4));

        const keyLight = new THREE.DirectionalLight(0xfff8ed, 2.15);
        keyLight.position.set(5, 8, 6);
        scene.add(keyLight);

        const museumRim = new THREE.SpotLight(0xf0a740, 4.8, 20, Math.PI / 4, 0.7, 1.2);
        museumRim.position.set(-5, 3.5, -3);
        scene.add(museumRim);

        const coolFill = new THREE.PointLight(0xb9d8ff, 1.15, 14, 1.5);
        coolFill.position.set(-4, 3.2, 5);
        scene.add(coolFill);

        const frontFill = new THREE.SpotLight(0xffffff, 0.95, 18, Math.PI / 3, 0.8, 1.1);
        frontFill.position.set(0, 4, 7);
        scene.add(frontFill);

        const loader = new loaderModule.GLTFLoader();
        const gltf = await loadProtectedModel(loader);
        if (disposed) return;

        const model = gltf.scene;
        const tireMaterials: Array<InstanceType<typeof THREE.MeshStandardMaterial>> = [];
        const hiddenBrandMaterial = new THREE.MeshBasicMaterial({
          color: 0x090909,
          opacity: 0,
          transparent: true,
        });
        hiddenBrandMaterial.name = "RahalHiddenBranding";
        const neutralPlateMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x111111,
          metalness: 0.15,
          roughness: 0.72,
        });
        neutralPlateMaterial.name = "RahalNeutralPlate";
        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = false;
          child.receiveShadow = false;
          const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
          const materials = sourceMaterials.map((material) => {
            if (material.name === "Logo") return hiddenBrandMaterial;
            if (material.name === "NumberPlate") return neutralPlateMaterial;
            if (!material.name.startsWith("PaletteMaterial001")) return material;
            const blackPaint = new THREE.MeshPhysicalMaterial({
              clearcoat: 1,
              clearcoatRoughness: 0.12,
              color: 0x000102,
              metalness: 0.54,
              roughness: 0.3,
            });
            blackPaint.name = "RahalBlackPaint";
            material.dispose();
            return blackPaint;
          });
          child.material = Array.isArray(child.material) ? materials : materials[0];
          materials.forEach((material) => {
            if (!(material instanceof THREE.MeshStandardMaterial)) return;
            if (material.name === "Tire") {
              tireMaterials.push(material);
              if (material.normalMap) {
                material.normalMap.wrapS = THREE.RepeatWrapping;
                material.normalMap.wrapT = THREE.RepeatWrapping;
              }
            }
          });
        });

        const sourceBounds = new THREE.Box3().setFromObject(model);
        const sourceSize = sourceBounds.getSize(new THREE.Vector3());
        const compactScene = window.innerWidth < 720;
        model.scale.setScalar((compactScene ? 1.82 : 2.42) / Math.max(sourceSize.x, sourceSize.z));
        const bounds = new THREE.Box3().setFromObject(model);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        model.position.set(-center.x, size.y / 2 - center.y + 0.02, -center.z);
        model.rotation.y = locale === "ar" ? -0.62 : 0.62;
        model.position.x =
          locale === "ar" ? (compactScene ? -1.55 : -1.4) : compactScene ? 1.55 : 1.4;
        model.position.y = compactScene ? -1.05 : -0.58;
        model.position.z = -0.55;
        scene.add(model);

        const smokeCanvas = document.createElement("canvas");
        smokeCanvas.width = 96;
        smokeCanvas.height = 96;
        const smokeContext = smokeCanvas.getContext("2d");
        if (smokeContext) {
          const smokeGradient = smokeContext.createRadialGradient(48, 48, 4, 48, 48, 46);
          smokeGradient.addColorStop(0, "rgba(225, 219, 205, .5)");
          smokeGradient.addColorStop(0.34, "rgba(170, 166, 158, .2)");
          smokeGradient.addColorStop(1, "rgba(80, 78, 73, 0)");
          smokeContext.fillStyle = smokeGradient;
          smokeContext.fillRect(0, 0, 96, 96);
        }
        const smokeTexture = new THREE.CanvasTexture(smokeCanvas);
        const smokeParticles = Array.from({ length: 8 }, (_, index) => {
          const material = new THREE.SpriteMaterial({
            color: index % 3 === 0 ? 0xd7c6a7 : 0xa7a39a,
            depthWrite: false,
            map: smokeTexture,
            opacity: 0,
            transparent: true,
          });
          const sprite = new THREE.Sprite(material);
          sprite.visible = false;
          scene.add(sprite);
          return { life: 0, material, sprite, velocityX: 0, velocityY: 0 };
        });
        let smokeCursor = 0;
        let lastProgress = 0;
        let lastOverlayOpacity = -1;

        const resize = () => {
          const width = Math.max(host.clientWidth, 1);
          const height = Math.max(host.clientHeight, 1);
          const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
          const pixelRatioLimit = memory <= 4 || width < 720 ? 0.85 : 1.05;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioLimit));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          activeUntil = performance.now() + 180;
          resumeScene?.();
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();
        setState("ready");

        const render = (now = performance.now()) => {
          if (disposed || !visible) {
            animationFrame = undefined;
            return;
          }

          const sceneTop = sceneElement.getBoundingClientRect().top + window.scrollY;
          const travel = Math.max(sceneElement.offsetHeight - window.innerHeight, 1);
          const progress = Math.min(Math.max((window.scrollY - sceneTop) / travel, 0), 1);
          const mobile = host.clientWidth < 720;
          const moving = progress > 0.006;
          const journey = Math.max((progress - 0.006) / 0.994, 0);
          const heroToContentBlend = Math.min(Math.max((progress - 0.008) / 0.055, 0), 1);
          const easedOverlayBlend =
            heroToContentBlend * heroToContentBlend * (3 - 2 * heroToContentBlend);
          const arrivalOpacity = mobile ? 0.54 : 0.84;
          const contentOpacity = mobile ? 0.26 : 0.38;
          const overlayOpacity =
            arrivalOpacity + (contentOpacity - arrivalOpacity) * easedOverlayBlend;
          if (Math.abs(overlayOpacity - lastOverlayOpacity) > 0.004) {
            host.style.setProperty("--drive-overlay-opacity", overlayOpacity.toFixed(3));
            lastOverlayOpacity = overlayOpacity;
          }
          const phase = journey * Math.PI * 4.1 + (locale === "ar" ? -Math.PI / 2 : Math.PI / 2);
          const driveDirection = moving && Math.cos(phase) >= 0 ? 1 : -1;
          const depthWave = (1 - Math.cos(journey * Math.PI * 4)) / 2;
          const targetX = moving
            ? Math.sin(phase) * (mobile ? 1.55 : 2.72)
            : locale === "ar"
              ? -1.4
              : 1.4;
          const targetY = moving ? (mobile ? -1.08 : -1.02) : mobile ? -1.05 : -0.58;
          const targetZ = moving ? -3.8 + depthWave * 5.15 : -0.55;
          const targetRotation = driveDirection * 0.86;
          const rotationDelta = Math.atan2(
            Math.sin(targetRotation - model.rotation.y),
            Math.cos(targetRotation - model.rotation.y),
          );

          model.position.x += (targetX - model.position.x) * 0.13;
          model.position.y +=
            (targetY + Math.sin(journey * Math.PI * 9) * 0.025 - model.position.y) * 0.12;
          model.position.z += (targetZ - model.position.z) * 0.11;
          model.rotation.y += rotationDelta * 0.08;

          const scrollVelocity = Math.abs(progress - lastProgress);
          tireMaterials.forEach((material) => {
            if (material.normalMap && moving) {
              material.normalMap.offset.y =
                (material.normalMap.offset.y + scrollVelocity * 24 * driveDirection + 1) % 1;
            }
          });

          if (moving && scrollVelocity > 0.00004) {
            const emissions = Math.min(Math.ceil(scrollVelocity * 700), 2);
            for (let index = 0; index < emissions; index += 1) {
              const particle = smokeParticles[smokeCursor % smokeParticles.length];
              smokeCursor += 1;
              particle.life = 1;
              particle.sprite.visible = true;
              particle.sprite.position.set(
                model.position.x - driveDirection * (mobile ? 0.42 : 0.55),
                model.position.y + 0.2 + Math.random() * 0.1,
                model.position.z - 0.16 + Math.random() * 0.16,
              );
              particle.sprite.scale.setScalar(0.13 + Math.random() * 0.1);
              particle.velocityX = -driveDirection * (0.012 + Math.random() * 0.016);
              particle.velocityY = 0.004 + Math.random() * 0.006;
            }
          }

          smokeParticles.forEach((particle) => {
            if (particle.life <= 0) return;
            particle.life = Math.max(particle.life - 0.018, 0);
            particle.sprite.position.x += particle.velocityX;
            particle.sprite.position.y += particle.velocityY;
            particle.sprite.scale.multiplyScalar(1.018);
            particle.material.opacity = particle.life * 0.34;
            particle.sprite.visible = particle.life > 0;
          });
          lastProgress = progress;
          camera.position.z = mobile ? 8.35 : 7.05;
          camera.position.y = mobile ? 1.35 : 1.55;
          camera.lookAt(0, 0.48, 0);
          renderer.render(scene, camera);
          const smokeActive = smokeParticles.some((particle) => particle.life > 0);
          if (now < activeUntil || smokeActive) {
            animationFrame = window.requestAnimationFrame(render);
          } else {
            animationFrame = undefined;
          }
        };

        resumeScene = () => {
          if (visible && animationFrame === undefined) {
            animationFrame = window.requestAnimationFrame(render);
          }
        };
        const activateDrive = () => {
          activeUntil = performance.now() + 520;
          resumeScene?.();
        };
        window.addEventListener("scroll", activateDrive, { passive: true });
        activeUntil = performance.now() + 240;
        resumeScene();

        cleanupScene = () => {
          resizeObserver.disconnect();
          window.removeEventListener("scroll", activateDrive);
          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
              Object.values(material).forEach((value) => {
                if (value instanceof THREE.Texture) value.dispose();
              });
              material.dispose();
            });
          });
          smokeParticles.forEach(({ material }) => material.dispose());
          smokeTexture.dispose();
          renderer.dispose();
          canvas.remove();
        };
      } catch {
        if (!disposed) setState("fallback");
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible) resumeScene?.();
      },
      { rootMargin: "80px 0px", threshold: 0.01 },
    );
    observer.observe(sceneElement);

    const startImmediately = () => {
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      void start();
    };
    const scheduleStart = () => {
      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(() => void start(), { timeout: 1800 });
      } else {
        fallbackTimer = setTimeout(() => void start(), 900);
      }
    };
    const scheduleAfterPageLoad = () => {
      if (document.readyState === "complete") scheduleStart();
      else window.addEventListener("load", scheduleStart, { once: true });
    };
    window.addEventListener("scroll", startImmediately, { once: true, passive: true });
    window.addEventListener("pointerdown", startImmediately, { once: true, passive: true });
    window.addEventListener("touchstart", startImmediately, { once: true, passive: true });
    scheduleAfterPageLoad();

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("load", scheduleStart);
      window.removeEventListener("scroll", startImmediately);
      window.removeEventListener("pointerdown", startImmediately);
      window.removeEventListener("touchstart", startImmediately);
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      cleanupScene?.();
    };
  }, [locale]);

  return (
    <div aria-hidden="true" className={`hero__drive-car hero__drive-car--${state}`} ref={hostRef}>
      <span className="hero__drive-shadow" />
      <span className="hero__drive-streak hero__drive-streak--one" />
      <span className="hero__drive-streak hero__drive-streak--two" />
    </div>
  );
}
