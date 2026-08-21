import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

const accountSelect = {
  id: true,
  fullNameAr: true,
  fullNameEn: true,
  email: true,
  phone: true,
  emailVerifiedAt: true,
  preferredLocale: true,
  dateOfBirth: true,
  nationality: true,
  address: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  createdAt: true,
  notificationPreference: {
    select: {
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: true,
      marketingEnabled: true,
      marketingConsentDecidedAt: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  },
} as const;

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCustomer(userId: string) {
    return this.prisma.client.user.findFirst({
      where: { id: userId, systemRole: "CUSTOMER" },
      select: accountSelect,
    });
  }

  updateProfile(
    userId: string,
    data: {
      fullNameAr: string | null;
      fullNameEn: string;
      preferredLocale: "ar" | "en";
      dateOfBirth: Date | null;
      nationality: string | null;
      address: string | null;
      emergencyContactName: string | null;
      emergencyContactPhone: string | null;
    },
    changedFields: string[],
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: userId },
        data,
        select: accountSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId: userId,
          action: "CUSTOMER_PROFILE_UPDATE",
          entityType: "USER",
          entityId: userId,
          reason: "SELF_SERVICE",
          newData: { changedFields },
        },
      });
      return updated;
    });
  }

  updateNotifications(
    userId: string,
    data: {
      emailEnabled: boolean;
      pushEnabled: boolean;
      marketingEnabled: boolean;
      quietHoursStart: string | null;
      quietHoursEnd: string | null;
    },
    previous: Record<string, boolean | string | null>,
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      const marketingConsentDecidedAt = new Date();
      await transaction.notificationPreference.upsert({
        where: { userId },
        create: { userId, inAppEnabled: true, ...data, marketingConsentDecidedAt },
        update: { inAppEnabled: true, ...data, marketingConsentDecidedAt },
      });
      await transaction.auditLog.create({
        data: {
          actorId: userId,
          action: "CUSTOMER_NOTIFICATION_PREFERENCES_UPDATE",
          entityType: "NOTIFICATION_PREFERENCE",
          entityId: userId,
          reason: "SELF_SERVICE",
          previousData: previous,
          newData: { inAppEnabled: true, ...data, marketingConsentDecided: true },
        },
      });
      return transaction.user.findUniqueOrThrow({
        where: { id: userId },
        select: accountSelect,
      });
    });
  }
}
