import type { Metadata } from "next";
import { BranchManagementWorkspace } from "../../../../components/branch-management-workspace";

export const metadata: Metadata = {
  title: "Branch management | Rahal",
  robots: { index: false, follow: false },
};

export default function EnglishAdminBranchesPage() {
  return <BranchManagementWorkspace locale="en" />;
}
