import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CustomerAccountOverview,
  CustomerAccountProfile,
  CustomerNotificationPreferences,
} from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import type { UpdateCustomerProfileDto, UpdateNotificationPreferencesDto } from "./account.dto";
import { AccountRepository } from "./account.repository";

const defaultPreferences: CustomerNotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  pushEnabled: true,
  marketingEnabled: false,
  marketingConsentDecided: false,
  quietHoursStart: null,
  quietHoursEnd: null,
};

type AccountRecord = NonNullable<Awaited<ReturnType<AccountRepository["findCustomer"]>>>;

function toProfile(record: AccountRecord): CustomerAccountProfile {
  return {
    id: record.id,
    fullNameAr: record.fullNameAr,
    fullNameEn: record.fullNameEn,
    email: record.email,
    phone: record.phone,
    emailVerified: Boolean(record.emailVerifiedAt),
    preferredLocale: record.preferredLocale === "en" ? "en" : "ar",
    dateOfBirth: record.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    nationality: record.nationality,
    address: record.address,
    emergencyContactName: record.emergencyContactName,
    emergencyContactPhone: record.emergencyContactPhone,
    memberSince: record.createdAt.toISOString(),
  };
}

function toPreferences(record: AccountRecord): CustomerNotificationPreferences {
  return record.notificationPreference
    ? {
        inAppEnabled: true,
        emailEnabled: record.notificationPreference.emailEnabled,
        pushEnabled: record.notificationPreference.pushEnabled,
        marketingEnabled: record.notificationPreference.marketingEnabled,
        marketingConsentDecided: Boolean(record.notificationPreference.marketingConsentDecidedAt),
        quietHoursStart: record.notificationPreference.quietHoursStart,
        quietHoursEnd: record.notificationPreference.quietHoursEnd,
      }
    : defaultPreferences;
}

function toOverview(record: AccountRecord): CustomerAccountOverview {
  return { profile: toProfile(record), notifications: toPreferences(record) };
}

@Injectable()
export class AccountService {
  constructor(
    private readonly auth: AuthService,
    private readonly account: AccountRepository,
  ) {}

  async overview(token: string | undefined): Promise<CustomerAccountOverview> {
    const session = await this.requireCustomer(token);
    const record = await this.account.findCustomer(session.user.id);
    if (!record) throw new NotFoundException("The customer account was not found.");
    return toOverview(record);
  }

  async updateProfile(
    token: string | undefined,
    input: UpdateCustomerProfileDto,
  ): Promise<CustomerAccountOverview> {
    const session = await this.requireCustomer(token);
    const current = await this.account.findCustomer(session.user.id);
    if (!current) throw new NotFoundException("The customer account was not found.");
    const dateOfBirth = input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null;
    if (
      dateOfBirth &&
      (Number.isNaN(dateOfBirth.getTime()) ||
        dateOfBirth.toISOString().slice(0, 10) !== input.dateOfBirth ||
        dateOfBirth >= new Date())
    ) {
      throw new BadRequestException("Date of birth must be a valid past date.");
    }
    const data = {
      fullNameAr: input.fullNameAr?.trim() || null,
      fullNameEn: input.fullNameEn.trim(),
      preferredLocale: input.preferredLocale,
      dateOfBirth,
      nationality: input.nationality?.trim() || null,
      address: input.address?.trim() || null,
      emergencyContactName: input.emergencyContactName?.trim() || null,
      emergencyContactPhone: input.emergencyContactPhone || null,
    };
    const changedFields = Object.entries(data)
      .filter(([key, value]) => {
        const previous = current[key as keyof typeof current];
        if (previous instanceof Date && value instanceof Date) {
          return previous.toISOString() !== value.toISOString();
        }
        return previous !== value;
      })
      .map(([key]) => key);
    if (!changedFields.length) return toOverview(current);
    return toOverview(await this.account.updateProfile(session.user.id, data, changedFields));
  }

  async updateNotifications(
    token: string | undefined,
    input: UpdateNotificationPreferencesDto,
  ): Promise<CustomerAccountOverview> {
    const session = await this.requireCustomer(token);
    const current = await this.account.findCustomer(session.user.id);
    if (!current) throw new NotFoundException("The customer account was not found.");
    const quietHoursStart = input.quietHoursStart || null;
    const quietHoursEnd = input.quietHoursEnd || null;
    if (Boolean(quietHoursStart) !== Boolean(quietHoursEnd)) {
      throw new BadRequestException("Quiet hours require both a start and an end time.");
    }
    if (quietHoursStart && quietHoursStart === quietHoursEnd) {
      throw new BadRequestException("Quiet hours start and end must be different.");
    }
    const data = {
      emailEnabled: input.emailEnabled,
      pushEnabled: input.pushEnabled,
      marketingEnabled: input.marketingEnabled,
      quietHoursStart,
      quietHoursEnd,
    };
    const previous = toPreferences(current);
    return toOverview(await this.account.updateNotifications(session.user.id, data, previous));
  }

  private async requireCustomer(token: string | undefined) {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "CUSTOMER") {
      throw new ForbiddenException("A customer account is required.");
    }
    return session;
  }
}
