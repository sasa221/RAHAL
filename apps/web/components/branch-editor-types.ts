import type { BranchSocialLink, BranchWorkingHours } from "@rahal/contracts";

export type BranchEditorForm = {
  id: string | null;
  nameAr: string;
  nameEn: string;
  governorateAr: string;
  governorateEn: string;
  areaAr: string;
  areaEn: string;
  streetAr: string;
  streetEn: string;
  landmarkAr: string;
  landmarkEn: string;
  addressAr: string;
  addressEn: string;
  latitude: number | null;
  longitude: number | null;
  phones: string[];
  whatsappNumber: string;
  whatsappVisible: boolean;
  whatsappMessageAr: string;
  whatsappMessageEn: string;
  email: string;
  socialLinks: BranchSocialLink[];
  workingHours: BranchWorkingHours;
  services: string[];
  managerId: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
};

const days = [
  "SATURDAY",
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const;

export function emptyBranchForm(): BranchEditorForm {
  return {
    id: null,
    nameAr: "",
    nameEn: "",
    governorateAr: "",
    governorateEn: "",
    areaAr: "",
    areaEn: "",
    streetAr: "",
    streetEn: "",
    landmarkAr: "",
    landmarkEn: "",
    addressAr: "",
    addressEn: "",
    latitude: null,
    longitude: null,
    phones: [""],
    whatsappNumber: "",
    whatsappVisible: false,
    whatsappMessageAr: "",
    whatsappMessageEn: "",
    email: "",
    socialLinks: [],
    workingHours: {
      timezone: "Africa/Cairo",
      weekly: days.map((day) => ({
        day,
        closed: day === "FRIDAY",
        opensAt: day === "FRIDAY" ? null : "09:00",
        closesAt: day === "FRIDAY" ? null : "21:00",
      })),
      exceptions: [],
    },
    services: ["BRANCH_PICKUP", "BRANCH_RETURN"],
    managerId: "",
    status: "DRAFT",
  };
}
