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

export type ReservationSubmissionBlocker =
  | "EMAIL_VERIFICATION_REQUIRED"
  | "PHONE_VERIFICATION_REQUIRED"
  | "CUSTOMER_DETAILS_REQUIRED"
  | "REQUIRED_CONSENTS_REQUIRED"
  | "APPROVED_POLICY_REQUIRED"
  | "REQUIRED_DOCUMENTS_REQUIRED"
  | "VEHICLE_UNAVAILABLE";

export type ReservationReview = {
  draftId: string;
  reference: string;
  status: "DRAFT";
  vehicle: { id: string; name: string };
  branch: { id: string; name: string };
  pickupAt: string;
  returnAt: string;
  driverRequested: boolean;
  estimate: { currency: "EGP"; total: number; finalAmountConfirmedAtBranch: true };
  customer: {
    fullName: string;
    emailMasked: string;
    phoneMasked: string;
    nationality: string | null;
    customerCategory: "EGYPTIAN" | "FOREIGN" | null;
    addressMasked: string | null;
    emergencyContactNameMasked: string | null;
    emergencyContactPhoneMasked: string | null;
  };
  verification: { email: boolean; phone: boolean };
  documents: Array<{
    type: ReservationDocumentType;
    label: string;
    status: "MISSING" | "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
  }>;
  consents: {
    policyVersion: string | null;
    requiredAccepted: boolean;
    marketingAccepted: boolean;
  };
  blockers: ReservationSubmissionBlocker[];
  canSubmit: boolean;
};

export type SubmittedReservation = {
  id: string;
  reference: string;
  status: "PENDING_REVIEW";
  submittedAt: string;
};

export type SalesReservationQueueItem = {
  id: string;
  reference: string;
  status:
    | "PENDING_REVIEW"
    | "UNDER_REVIEW"
    | "MORE_INFORMATION_REQUIRED"
    | "PRE_APPROVED"
    | "ALTERNATIVE_OFFERED"
    | "CONFIRMED"
    | "ACTIVE";
  submittedAt: string;
  pickupAt: string;
  returnAt: string;
  driverRequested: boolean;
  estimate: { currency: "EGP"; total: number };
  vehicle: { id: string; name: string };
  branch: { id: string; name: string };
  customer: { name: string; emailMasked: string; phoneMasked: string };
  assignedToCurrentUser: boolean;
};

export type SalesReservationReview = SalesReservationQueueItem & {
  customer: SalesReservationQueueItem["customer"] & {
    nationality: string | null;
    customerCategory: "EGYPTIAN" | "FOREIGN" | null;
    addressMasked: string | null;
    emergencyContactNameMasked: string | null;
    emergencyContactPhoneMasked: string | null;
  };
  verification: { email: boolean; phone: boolean };
  consents: { policyVersion: string | null; requiredAccepted: boolean };
  documents: Array<{
    type: ReservationDocumentType;
    status: "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED";
    uploadedAt: string;
  }>;
  timeline: Array<{
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }>;
  alternativeOffer: ReservationAlternativeOffer | null;
  branchProgress: {
    expectedDepositEgp: number | null;
    attendedAt: string | null;
    deposit: {
      amountEgp: number;
      receiptNumber: string;
      recordedAt: string;
    } | null;
    contract: {
      status: "DRAFT" | "READY_FOR_SIGNATURE" | "SIGNED" | "VOIDED";
      signedAt: string | null;
    } | null;
    booking: {
      reference: string;
      status: "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
      confirmedAt: string;
    } | null;
    operations: Array<{
      type: "DELIVERY" | "RETURN";
      odometerKm: number;
      fuelLevelPercent: number;
      conditionNote: string;
      recordedAt: string;
    }>;
  };
};

export type SalesBranchChecklistResult = {
  id: string;
  reference: string;
  status: "PRE_APPROVED";
  attendedAt: string;
  depositRecordedAt: string;
  contractSignedAt: string;
};

export type SalesBookingConfirmationResult = {
  id: string;
  reference: string;
  status: "CONFIRMED";
  booking: {
    id: string;
    reference: string;
    status: "CONFIRMED";
    confirmedAt: string;
  };
};

export type SalesBookingOperationResult = {
  id: string;
  reference: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  action: "DELIVER" | "RETURN" | "COMPLETE" | "CANCEL" | "NO_SHOW";
  recordedAt: string;
};

export type SalesReservationDecisionResult = {
  id: string;
  reference: string;
  status: "MORE_INFORMATION_REQUIRED" | "PRE_APPROVED" | "REJECTED";
  decidedAt: string;
  expiresAt: string | null;
};

export type CustomerReservationStatus =
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "PRE_APPROVED"
  | "ALTERNATIVE_OFFERED"
  | "REJECTED"
  | "EXPIRED"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type CustomerReservationSummary = {
  id: string;
  reference: string;
  status: CustomerReservationStatus;
  submittedAt: string;
  pickupAt: string;
  returnAt: string;
  driverRequested: boolean;
  estimate: { currency: "EGP"; total: number };
  vehicle: { id: string; name: string };
  branch: { id: string; name: string };
  needsResponse: boolean;
  preApprovalExpiresAt: string | null;
};

export type CustomerReservationDetail = CustomerReservationSummary & {
  documents: Array<{
    type: ReservationDocumentType;
    status: "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED";
  }>;
  messages: Array<{
    id: string;
    sender: "CUSTOMER" | "RAHAL";
    body: string;
    createdAt: string;
  }>;
  alternativeOffer: ReservationAlternativeOffer | null;
  branchProgress: {
    attended: boolean;
    depositRecorded: boolean;
    contractSigned: boolean;
    bookingReference: string | null;
    confirmedAt: string | null;
  };
  rentalProgress: {
    deliveredAt: string | null;
    returnedAt: string | null;
    completedAt: string | null;
  };
};

export type ReservationAlternativeOffer = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "WITHDRAWN";
  proposedPickupAt: string;
  proposedReturnAt: string;
  estimate: { currency: "EGP"; total: number; dailyRate: number };
  vehicle: { id: string; name: string };
  note: string | null;
  expiresAt: string;
  respondedAt: string | null;
};

export type SalesAlternativeOfferResult = {
  id: string;
  reservationId: string;
  reservationStatus: "ALTERNATIVE_OFFERED";
  expiresAt: string;
};

export type CustomerAlternativeOfferResponse = {
  id: string;
  reservationId: string;
  offerStatus: "ACCEPTED" | "DECLINED";
  reservationStatus: "UNDER_REVIEW";
  respondedAt: string;
};

export type CustomerInformationResponse = {
  id: string;
  reference: string;
  status: "UNDER_REVIEW";
  respondedAt: string;
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

export type FleetCalendarEventKind =
  "PENDING" | "CONFIRMED" | "ACTIVE" | "MAINTENANCE" | "MANUAL_BLOCK";

export type FleetCalendarEvent = {
  id: string;
  vehicleId: string;
  kind: FleetCalendarEventKind;
  reference: string | null;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  blocksAvailability: boolean;
  removable: boolean;
};

export type FleetCalendarVehicle = {
  id: string;
  slug: string;
  name: string;
  registrationNumber: string;
  status:
    | "AVAILABLE"
    | "PENDING_REQUEST"
    | "CONFIRMED_BOOKING"
    | "RENTED"
    | "MAINTENANCE"
    | "MANUALLY_BLOCKED"
    | "OVERDUE"
    | "INACTIVE"
    | "ARCHIVED";
  branch: { id: string; name: string };
  events: FleetCalendarEvent[];
};

export type FleetCalendar = {
  from: string;
  to: string;
  canManageBlocks: boolean;
  vehicles: FleetCalendarVehicle[];
};

export type FleetBlockResult = {
  id: string;
  vehicleId: string;
  type: "MAINTENANCE" | "MANUAL_BLOCK";
  startsAt: string;
  endsAt: string;
  reason: string;
  createdAt: string;
};
