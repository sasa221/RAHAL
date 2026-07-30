import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("workspace role boundary", () => {
  it("keeps customer, sales, and admin workspaces strictly separated", () => {
    const boundary = read("apps/web/components/workspace-access-boundary.tsx");
    const shell = read("apps/web/components/workspace-shell.tsx");

    expect(boundary).toContain('if (kind === "customer") return role === "CUSTOMER"');
    expect(boundary).toContain('if (kind === "sales") return role === "SALES"');
    expect(boundary).toContain('return role === "ADMIN" || role === "SUPER_ADMIN"');
    expect(boundary).toContain("response.status === 401");
    expect(boundary).toContain("This workspace is not assigned to your account");
    expect(boundary).toContain("هذه المساحة ليست مخصّصة لحسابك");
    expect(shell).toContain("<WorkspaceAccessBoundary");
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
});
