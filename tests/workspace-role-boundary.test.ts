import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("workspace role boundary", () => {
  it("keeps customer, sales, and admin workspaces strictly separated", () => {
    const boundary = read("apps/web/components/workspace-access-boundary.tsx");
    const shell = read("apps/web/components/workspace-shell.tsx");
    const contracts = read("packages/contracts/src/index.ts");

    expect(contracts).toContain('customer: ["CUSTOMER"]');
    expect(contracts).toContain('sales: ["SALES"]');
    expect(contracts).toContain('admin: ["ADMIN", "SUPER_ADMIN"]');
    expect(boundary).toContain("roleCanOpenWorkspace(kind, user.role)");
    expect(boundary).toContain("response.status === 401");
    expect(boundary).toContain("This workspace is not assigned to your account");
    expect(boundary).toContain("هذه المساحة ليست مخصّصة لحسابك");
    expect(boundary).toContain('className="workspace-loading"');
    expect(boundary).toContain('aria-busy="true"');
    expect(shell).toContain("<WorkspaceAccessBoundary");
  });

  it("keeps admin request review inside the admin workspace", () => {
    const shell = read("apps/web/components/workspace-shell.tsx");
    const notifications = read("apps/web/components/notification-center.tsx");
    const adminPage = read("apps/web/app/admin/requests/page.tsx");
    const englishAdminPage = read("apps/web/app/en/admin/requests/page.tsx");

    expect(shell).toContain('kind === "admin" ? "/admin/requests"');
    expect(notifications).toContain('kind === "admin" ? "/admin/requests"');
    expect(adminPage).toContain('workspaceKind="admin"');
    expect(englishAdminPage).toContain('workspaceKind="admin"');
  });

  it("returns every denied role to its own workspace", () => {
    const boundary = read("apps/web/components/workspace-access-boundary.tsx");

    expect(boundary).toContain('role === "CUSTOMER"');
    expect(boundary).toContain('localizedPath(locale, "/account/requests")');
    expect(boundary).toContain('role === "SALES"');
    expect(boundary).toContain('localizedPath(locale, "/sales")');
    expect(boundary).toContain('localizedPath(locale, "/admin")');
  });

  it("distinguishes a launched sales or admin PWA from the public app", () => {
    const installAction = read("apps/web/components/workspace-install-action.tsx");
    const manifest = read("apps/web/app/manifest.ts");

    expect(manifest).toContain('id: "/"');
    expect(installAction).toContain('"rahal:standalone-workspace"');
    expect(installAction).toContain('get("source") === "pwa"');
  });

  it("keeps sign out visible in both desktop and mobile workspace headers", () => {
    const shell = read("apps/web/components/workspace-shell.tsx");
    const styles = read("apps/web/app/globals.css");
    const accountEntry = read("apps/web/components/account-entry-link.tsx");

    expect(shell).toContain('className="portal-topbar-sign-out"');
    expect(shell).toContain('method: "DELETE"');
    expect(shell).toContain('new Event("rahal:session-changed")');
    expect(styles).toContain(".portal-topbar-sign-out");
    expect(accountEntry).toContain('session.user.role === "SALES"');
    expect(accountEntry).toContain('"/admin"');
  });

  it("exposes every authorized workspace tool through an accessible mobile command menu", () => {
    const shell = read("apps/web/components/workspace-shell.tsx");
    const styles = read("apps/web/app/globals.css");

    expect(shell).toContain('aria-controls="portal-mobile-menu"');
    expect(shell).toContain("navigation.map(([label, href, icon], index)");
    expect(shell).toContain('className="portal-mobile-menu-backdrop"');
    expect(shell).toContain('event.key === "Escape"');
    expect(shell).toContain('document.body.style.overflow = "hidden"');
    expect(styles).toContain(".portal-mobile-menu > nav a.is-active");
    expect(styles).toContain("@keyframes portal-mobile-menu-enter");
    expect(styles).toContain("@media (max-width: 920px)");
  });
});
