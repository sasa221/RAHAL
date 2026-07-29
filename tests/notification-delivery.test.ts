import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("external notification delivery", () => {
  it("processes transactional outbox events with retryable channel deliveries", () => {
    const worker = read("apps/api/src/notifications/notification-outbox.service.ts");
    const repository = read("apps/api/src/notifications/notifications.repository.ts");
    expect(worker).toContain("claimNextEvent");
    expect(worker).toContain("sendEmail");
    expect(worker).toContain("sendWhatsApp");
    expect(worker).toContain("sendPush");
    expect(worker).toContain("stringValue(payload.userId)");
    expect(worker).toContain("stringValue(payload.reservationId) ?? event.aggregateId");
    expect(repository).toContain("markEventProcessed");
    expect(repository).toContain("retryEvent");
  });

  it("encrypts browser subscriptions and never stores public endpoints", () => {
    const crypto = read("apps/api/src/notifications/push-subscription-crypto.service.ts");
    const schema = read("packages/database/prisma/schema.prisma");
    expect(crypto).toContain('createCipheriv("aes-256-gcm"');
    expect(crypto).toContain("cipher.setAAD");
    expect(schema).toContain("subscriptionCiphertext");
    expect(schema).toContain("@@unique([notificationId, channel])");
  });

  it("provides an explicit browser opt-in instead of prompting on page load", () => {
    const center = read("apps/web/components/notification-center.tsx");
    const gate = read("apps/web/components/push-permission-gate.tsx");
    const pushSetup = read("apps/web/lib/push-notifications.ts");
    const layout = read("apps/web/app/layout.tsx");
    const worker = read("apps/web/public/push-sw.js");
    expect(center).toContain("async function enablePush");
    expect(center).toContain("onClick={() => void enablePush()}");
    expect(pushSetup).toContain("Notification.requestPermission()");
    expect(pushSetup).toContain("pushManager.subscribe");
    expect(gate).toContain("rahal:session-changed");
    expect(gate).toContain('setState("REMINDER")');
    expect(gate).toContain("onClick={() => void enable()}");
    expect(layout).toContain("<PushPermissionGate");
    expect(worker).toContain('globalThis.addEventListener("push"');
    expect(worker).toContain('globalThis.addEventListener("notificationclick"');
  });

  it("ships an installable mobile web app manifest", () => {
    const layout = read("apps/web/app/layout.tsx");
    const manifest = read("apps/web/app/manifest.ts");
    expect(layout).toContain('manifest: "/manifest.webmanifest"');
    expect(layout).toContain("appleWebApp");
    expect(manifest).toContain('display: "standalone"');
    expect(manifest).toContain('orientation: "portrait-primary"');
  });
});
