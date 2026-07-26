import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("in-app notification center", () => {
  const controller = read("apps/api/src/notifications/notifications.controller.ts");
  const repository = read("apps/api/src/notifications/notifications.repository.ts");
  const service = read("apps/api/src/notifications/notifications.service.ts");
  const center = read("apps/web/components/notification-center.tsx");
  const shell = read("apps/web/components/workspace-shell.tsx");
  const contracts = read("packages/contracts/src/index.ts");

  it("exposes authenticated inbox and idempotent read boundaries", () => {
    expect(controller).toContain('@Controller("notifications")');
    expect(controller).toContain('@Post("read-all")');
    expect(controller).toContain('@Post(":id/read")');
    expect(repository).toContain("where: { id, userId, archivedAt: null");
    expect(repository).toContain("if (owned.readAt)");
    expect(service).toContain("this.auth.getSession(token)");
  });

  it("keeps the inbox bounded and excludes provider/outbox details", () => {
    expect(repository).toContain("take: 50");
    expect(repository).toContain("archivedAt: null");
    expect(contracts).not.toContain("providerId: string");
    expect(contracts).not.toContain("lastError: string");
    expect(center).not.toContain("notificationEvent");
    expect(center).not.toContain("deliveries");
  });

  it("localizes on the server and returns reservation targets without customer data", () => {
    expect(service).toContain('locale === "ar" ? item.titleAr : item.titleEn');
    expect(service).toContain('kind: "RESERVATION"');
    const notificationContract = contracts.split("export type InAppNotification")[1]!;
    expect(notificationContract).not.toContain("customer");
    expect(notificationContract).not.toContain("payload");
  });

  it("ships one shared bilingual drawer with unread and important states", () => {
    expect(center).toContain("ar: {");
    expect(center).toContain("en: {");
    expect(center).toContain('className="notification-drawer"');
    expect(center).toContain("notification.important");
    expect(center).toContain("inbox.unreadCount > 99");
    expect(shell).toContain("<NotificationCenter");
  });

  it("refreshes lightly and opens the exact reservation workspace", () => {
    expect(center).toContain("30_000");
    expect(center).toContain('"visibilitychange"');
    expect(center).toContain('cache: "no-store"');
    expect(center).toContain("?request=");
    expect(read("apps/web/components/customer-requests-workspace.tsx")).toContain('get("request")');
    expect(read("apps/web/components/sales-review-workspace.tsx")).toContain('get("request")');
  });
});
