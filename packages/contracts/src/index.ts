export type Locale = "ar" | "en";

export type ApiSuccess<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
};

export type VehicleOperationalStatus =
  | "AVAILABLE"
  | "PENDING_REQUEST"
  | "CONFIRMED_BOOKING"
  | "RENTED"
  | "MAINTENANCE"
  | "MANUALLY_BLOCKED"
  | "OVERDUE"
  | "INACTIVE"
  | "ARCHIVED";

export type DemoVehicle = {
  id: string;
  nameAr: string;
  nameEn: string;
  categoryAr: string;
  categoryEn: string;
  dailyRateEgp: number;
  status: VehicleOperationalStatus;
};

export type PublicVehicle = {
  id: string;
  name: Record<Locale, string>;
  category: Record<Locale, string>;
  categoryKey: "economy" | "sedan" | "suv";
  image: string;
  imageAlt: Record<Locale, string>;
  dailyRateEgp: number;
  weeklyRateEgp: number;
  minimumDays: number;
  seats: number;
  bags: number;
  year: number;
  transmission: Record<Locale, string>;
  driverPolicy: Record<Locale, string>;
  driverPolicyKey: "optional" | "required" | "self-drive";
  fuelPolicy: Record<Locale, string>;
  mileagePolicy: Record<Locale, string>;
  status: "available" | "review";
};

export type ReservationDraft = {
  id: string;
  reference: string;
  status: "DRAFT";
  vehicleId: string;
  pickupAt: string;
  returnAt: string;
  driverRequested: boolean;
  estimatedTotalEgp: number;
};

export type ReservationCustomerDetails = {
  draftId: string;
  reference: string;
  fullName: string;
  emailMasked: string;
  phoneMasked: string;
  nationality: string;
  customerCategory: "EGYPTIAN" | "FOREIGN";
  address: string;
  emergencyContactName: string;
  emergencyContactPhoneMasked: string;
  completedAt: string;
};

export type ReservationDocumentType =
  | "NATIONAL_ID_FRONT"
  | "NATIONAL_ID_BACK"
  | "DRIVING_LICENSE_FRONT"
  | "DRIVING_LICENSE_BACK"
  | "PASSPORT";

export type ReservationDocumentRequirement = {
  key: string;
  type: ReservationDocumentType;
  label: string;
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  uploaded: boolean;
  document?: {
    id: string;
    type: ReservationDocumentType;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    status: "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
    uploadedAt: string;
  };
};

export type ReservationDocumentChecklist = {
  draftId: string;
  reference: string;
  developmentRules: boolean;
  requirements: ReservationDocumentRequirement[];
  complete: boolean;
};

export type ReservationConsentBundle = {
  version: string;
  developmentOnly: boolean;
  policies: Array<{
    key: "RENTAL_TERMS" | "PRIVACY" | "DOCUMENT_PROCESSING" | "RESERVATION_PROCESS";
    title: string;
    body: string;
  }>;
};

export type ReservationConsents = {
  draftId: string;
  reference: string;
  policyVersion: string;
  requiredAcceptedAt: string;
  marketingAccepted: boolean;
};

export type BranchSummary = {
  id: string;
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string | null;
  active: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  preferredLocale: Locale;
  role: "CUSTOMER" | "SALES" | "ADMIN" | "SUPER_ADMIN";
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED";
  emailVerified: boolean;
  phoneVerified: boolean;
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: string;
};
