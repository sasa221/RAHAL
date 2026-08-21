import type { ReactNode } from "react";

export type WorkspaceStateKind = "loading" | "error" | "empty" | "no-results" | "no-permission";

export function WorkspaceState({
  kind,
  title,
  description,
  action,
}: {
  kind: WorkspaceStateKind;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section
      aria-busy={kind === "loading"}
      aria-live={kind === "error" || kind === "no-permission" ? "assertive" : "polite"}
      className={`workspace-state workspace-state--${kind}`}
      role={kind === "error" || kind === "no-permission" ? "alert" : "status"}
    >
      <span aria-hidden="true" className="workspace-state__mark">
        {kind === "loading" ? "…" : kind === "error" ? "!" : kind === "no-permission" ? "×" : "0"}
      </span>
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="workspace-state__action">{action}</div> : null}
    </section>
  );
}
