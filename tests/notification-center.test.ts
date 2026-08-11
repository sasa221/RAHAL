import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("in-app notification center", () => {
  const controller = read("apps/api/src/notifications/notifications.controller.ts");
  const repository = read("apps/api/src/notifications/notifications.repository.ts");
  const service = read("apps/api/src/notifications/notifications.service.ts");
  const center = read("apps/web/components/notification-center.tsx");
  const publicEntry = read("apps/web/components/public-notification-entry.tsx");
  const publicHeader = read("apps/web/components/public-home.tsx");
  const shell = read("apps/web/components/workspace-shell.tsx");
  const campaignStudio = read("apps/web/components/notification-campaign-studio.tsx");
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
    const notificationContract = contracts
      .split("export type InAppNotification")[1]!
      .split("export type NotificationInbox")[0]!;
    expect(notificationContract).not.toContain("customer");
    expect(notificationContract).not.toContain("payload");
  });

  it("ships one shared bilingual dialog with visible metrics and filters", () => {
    expect(center).toContain("ar: {");
    expect(center).toContain("en: {");
    expect(center).toContain('className="notification-drawer"');
    expect(center).toContain('role="dialog"');
    expect(center).toContain('aria-modal="true"');
    expect(center).toContain("createPortal(");
    expect(center).toContain("document.body");
    expect(center).toContain('"UNREAD"');
    expect(center).toContain('"IMPORTANT"');
    expect(center).toContain("notification-drawer__metrics");
    expect(center).toContain("notification.important");
    expect(center).toContain("inbox.unreadCount > 99");
    expect(shell).toContain("<NotificationCenter");
  });

  it("refreshes lightly, supports keyboard close, and opens the exact reservation workspace", () => {
    expect(center).toContain("30_000");
    expect(center).toContain('"visibilitychange"');
    expect(center).toContain('event.key === "Escape"');
    expect(center).toContain('document.body.style.overflow = "hidden"');
    expect(center).toContain('cache: "no-store"');
    expect(center).toContain("/api/notifications?locale=${locale}");
    expect(center).toContain("?request=");
    expect(read("apps/web/components/customer-requests-workspace.tsx")).toContain('get("request")');
    expect(read("apps/web/components/sales-review-workspace.tsx")).toContain('get("request")');
  });

  it("surfaces a new unread update outside the drawer on desktop and mobile", () => {
    expect(center).toContain("featuredNotification");
    expect(center).toContain("rahal:notification-preview:");
    expect(center).toContain("className={`notification-preview");
    expect(center).toContain("document.body");
    expect(read("apps/web/app/globals.css")).toContain("@media (max-width: 560px)");
  });

  it("keeps the authenticated notification signal visible in every public header", () => {
    const styles = read("apps/web/app/globals.css");

    expect(publicHeader).toContain("<PublicNotificationEntry");
    expect(publicEntry).toContain('fetch("/api/auth/session"');
    expect(publicEntry).toContain('"rahal:session-changed"');
    expect(publicEntry).toContain('session.user.role === "CUSTOMER" ? "customer" : "sales"');
    expect(publicEntry).toContain("<NotificationCenter");
    expect(center).toContain('" has-unread"');
    expect(styles).toContain(".public-header-notifications .notification-trigger");
    expect(styles).toContain(".notification-trigger.has-unread");
    expect(styles).toContain("@keyframes notification-bell-signal");
  });

  it("localizes known campaign audience and permission errors", () => {
    expect(campaignStudio).toContain('"لا يوجد عملاء نشطون لاستقبال هذه الرسالة حتى الآن."');
    expect(campaignStudio).toContain(
      '"لا يوجد عملاء نشطون وافقوا على استقبال العروض والرسائل التسويقية حتى الآن."',
    );
    expect(campaignStudio).toContain("localizedCampaignError(");
    expect(campaignStudio).toContain("return text.permissionRequired");
  });

  it("supports a privacy-bounded individual recipient picker for admin and sales", () => {
    expect(campaignStudio).toContain("campaign-recipients");
    expect(campaignStudio).toContain('deliveryScope === "INDIVIDUAL"');
    expect(campaignStudio).toContain("selectedRecipient?.id");
    expect(campaignStudio).toContain("recipient.marketingEnabled");
    expect(campaignStudio).toContain("maskedContact");
  });
});
