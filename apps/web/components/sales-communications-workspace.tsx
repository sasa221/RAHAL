"use client";

import type { PublicLocale } from "../lib/public-content";
import { NotificationCampaignStudio } from "./notification-campaign-studio";
import { WorkspaceShell } from "./workspace-shell";

export function SalesCommunicationsWorkspace({ locale }: { locale: PublicLocale }) {
  return (
    <WorkspaceShell activePage="communications" kind="sales" locale={locale}>
      <div className="sales-communications-workspace">
        <h1 className="visually-hidden">
          {locale === "ar" ? "مركز حملات وإشعارات رحال" : "Rahal notification campaigns"}
        </h1>
        <NotificationCampaignStudio kind="sales" locale={locale} />
      </div>
    </WorkspaceShell>
  );
}
