import type { Metadata } from "next";
import { BranchManagementWorkspace } from "../../../components/branch-management-workspace";

export const metadata: Metadata = {
  title: "إدارة الفروع | رحال",
  robots: { index: false, follow: false },
};

export default function AdminBranchesPage() {
  return <BranchManagementWorkspace locale="ar" />;
}
