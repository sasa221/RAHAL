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

export type BranchSummary = {
  id: string;
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string | null;
  active: boolean;
};
