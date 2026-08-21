import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { storageStatePath, type E2eRole } from "./fixture-data";

type Role = Extract<E2eRole, "customer" | "sales" | "admin" | "super-admin">;

const routes: Array<{ role: Role; path: string }> = [
  { role: "customer", path: "/account/profile" },
  { role: "customer", path: "/account/requests" },
  { role: "customer", path: "/account/security" },
  { role: "sales", path: "/sales" },
  { role: "sales", path: "/sales/communications" },
  { role: "sales", path: "/fleet" },
  { role: "admin", path: "/admin" },
  { role: "admin", path: "/admin/requests" },
  { role: "admin", path: "/admin/audit" },
  { role: "admin", path: "/admin/branches" },
  { role: "admin", path: "/admin/communications" },
  { role: "admin", path: "/admin/content" },
  { role: "admin", path: "/admin/customers" },
  { role: "admin", path: "/admin/documents" },
  { role: "admin", path: "/admin/fleet" },
  { role: "admin", path: "/admin/policies" },
  { role: "admin", path: "/admin/reports" },
  { role: "admin", path: "/admin/reviews" },
  { role: "admin", path: "/admin/staff" },
  { role: "super-admin", path: "/admin/requests" },
];

for (const route of routes) {
  test(`${route.role} ${route.path} has reachable links and unobstructed controls`, async ({
    browser,
  }, testInfo) => {
    const context = await roleContext(browser, testInfo, route.role);
    const page = await context.newPage();
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    const audit = await interactionAudit(page);
    expect(audit.obstructed, `obstructed controls on ${route.path}`).toEqual([]);
    expect(audit.unnamed, `unnamed controls on ${route.path}`).toEqual([]);
    testInfo.annotations.push({
      type: "interaction-inventory",
      description: JSON.stringify(audit.inventory),
    });

    const uniqueLinks = [...new Set(audit.internalLinks)];
    for (const href of uniqueLinks) {
      const destination = await context.newPage();
      const response = await destination.goto(href, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route.path} -> ${href}`).toBeLessThan(400);
      await destination.waitForLoadState("load");
      await destination.locator("main").first().waitFor();
      await expect(
        destination.locator("main.workspace-access"),
        `${route.role} is denied after following ${route.path} -> ${href}`,
      ).toHaveCount(0);
      await destination.close();
    }
    await context.close();
  });
}

async function roleContext(browser: Browser, testInfo: TestInfo, role: Role) {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, role),
  });
  return context;
}

async function interactionAudit(page: Page) {
  return page.evaluate(() => {
    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return (
        style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0
      );
    };
    const controls = [
      ...document.querySelectorAll<HTMLElement>("button, a, input, select, textarea"),
    ]
      .filter(visible)
      .filter((element) => !element.hasAttribute("disabled"));
    const obstructed = controls.flatMap((element) => {
      const box = element.getBoundingClientRect();
      const bottomNav = document.querySelector<HTMLElement>(".portal-bottom-nav");
      const contentBottom = bottomNav?.getBoundingClientRect().top ?? innerHeight;
      if (box.top < 0 || box.bottom > contentBottom || box.left < 0 || box.right > innerWidth) {
        return [];
      }
      const x = Math.max(0, Math.min(innerWidth - 1, box.left + box.width / 2));
      const y = Math.max(0, Math.min(contentBottom - 1, box.top + box.height / 2));
      const top = document.elementFromPoint(x, y);
      if (top && (top === element || element.contains(top))) return [];
      return [
        {
          label:
            element.getAttribute("aria-label") ||
            element.textContent?.trim().slice(0, 80) ||
            element.tagName,
          blockedBy:
            top?.closest("button, a, aside, header, nav")?.className || top?.tagName || "unknown",
        },
      ];
    });
    const internalLinks = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
      .filter((link) => visible(link))
      .map((link) => link.href)
      .filter((href) => href.startsWith(location.origin))
      .filter((href) => new URL(href).pathname !== location.pathname || new URL(href).hash);
    const hasProgrammaticName = (element: HTMLElement) => {
      if (element.getAttribute("aria-label")?.trim() || element.getAttribute("title")?.trim()) {
        return true;
      }
      if (element.textContent?.trim()) return true;
      if (element instanceof HTMLInputElement) {
        if (element.type === "hidden") return true;
        const explicitLabel = element.id
          ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
          : null;
        const wrappingLabel = element.closest("label");
        return Boolean(
          explicitLabel?.textContent?.trim() ||
          wrappingLabel?.textContent?.trim() ||
          element.placeholder?.trim(),
        );
      }
      return element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
    };
    const unnamed = controls
      .filter((element) => !hasProgrammaticName(element))
      .map((element) => element.outerHTML.slice(0, 180));
    const inventory = {
      buttons: controls.filter((element) => element.matches("button")).length,
      links: controls.filter((element) => element.matches("a")).length,
      forms: document.querySelectorAll("form").length,
      tabs: controls.filter((element) => element.getAttribute("role") === "tab").length,
      filters: controls.filter((element) =>
        /filter|search/i.test(
          `${element.id} ${element.getAttribute("name") ?? ""} ${element.getAttribute("aria-label") ?? ""}`,
        ),
      ).length,
      uploads: controls.filter(
        (element) => element instanceof HTMLInputElement && element.type === "file",
      ).length,
      exports: controls.filter((element) => /export|تصدير/i.test(element.textContent ?? "")).length,
    };
    return { obstructed, unnamed, internalLinks, inventory };
  });
}
