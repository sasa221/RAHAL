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
    expect(worker).not.toContain("sendWhatsApp");
    expect(worker).not.toContain("graph.facebook.com");
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
    expect(gate).toContain("rahal:push-guide-requested");
    expect(gate).toContain('setState("REMINDER")');
    expect(gate).toContain("const canOpenModal");
    expect(gate).toContain('const canOpenModal = pathname === "/auth"');
    expect(gate).toContain("onClick={() => void enable()}");
    expect(layout).toContain("<PushPermissionGate");
    expect(worker).toContain('globalThis.addEventListener("push"');
    expect(worker).toContain('globalThis.addEventListener("notificationclick"');
  });

  it("guides iOS users to install before checking browser push support", () => {
    const gate = read("apps/web/components/push-permission-gate.tsx");
    const center = read("apps/web/components/notification-center.tsx");
    const pushSetup = read("apps/web/lib/push-notifications.ts");
    const enableBoundary = pushSetup.split("export async function enablePushNotifications")[1]!;

    expect(pushSetup).toContain('window.navigator.platform === "MacIntel"');
    expect(pushSetup).toContain("window.navigator.maxTouchPoints > 1");
    expect(enableBoundary.indexOf("requiresIosInstallation()")).toBeLessThan(
      enableBoundary.indexOf("supportsWebPush()"),
    );
    expect(gate).toContain('setState("INSTALL_REQUIRED")');
    expect(gate).toContain('className="push-install-steps"');
    expect(gate).toContain("Add to Home Screen");
    expect(center).toContain('new Event("rahal:push-guide-requested")');
  });

  it("ships an installable mobile web app manifest", () => {
    const layout = read("apps/web/app/layout.tsx");
    const manifest = read("apps/web/app/manifest.ts");
    expect(layout).toContain('manifest: "/manifest.webmanifest"');
    expect(layout).toContain("appleWebApp");
    expect(manifest).toContain('display: "standalone"');
    expect(manifest).toContain('orientation: "portrait-primary"');
  });

  it("ships distinct install identities and entry points for sales and administration", () => {
    const salesManifest = read("apps/web/public/manifest-sales.webmanifest");
    const adminManifest = read("apps/web/public/manifest-admin.webmanifest");
    const salesLayout = read("apps/web/app/sales/layout.tsx");
    const englishSalesLayout = read("apps/web/app/en/sales/layout.tsx");
    const adminLayout = read("apps/web/app/admin/layout.tsx");
    const englishAdminLayout = read("apps/web/app/en/admin/layout.tsx");
    const installAction = read("apps/web/components/workspace-install-action.tsx");
    const workspaceShell = read("apps/web/components/workspace-shell.tsx");

    expect(JSON.parse(salesManifest)).toMatchObject({
      id: "/sales",
      start_url: "/sales?source=pwa",
      display: "standalone",
    });
    expect(JSON.parse(adminManifest)).toMatchObject({
      id: "/admin",
      start_url: "/admin?source=pwa",
      display: "standalone",
    });
    expect(salesLayout).toContain('manifest: "/manifest-sales.webmanifest"');
    expect(englishSalesLayout).toContain('manifest: "/manifest-sales.webmanifest"');
    expect(adminLayout).toContain('manifest: "/manifest-admin.webmanifest"');
    expect(englishAdminLayout).toContain('manifest: "/manifest-admin.webmanifest"');
    expect(installAction).toContain('"beforeinstallprompt"');
    expect(installAction).toContain('"appinstalled"');
    expect(installAction).toContain('navigator.serviceWorker.register("/push-sw.js"');
    expect(workspaceShell).toContain("<WorkspaceInstallAction");
  });
});
