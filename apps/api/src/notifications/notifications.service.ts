import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  NotificationCampaignCreateResult,
  NotificationCampaignPage,
  NotificationCampaignRecipientPage,
  NotificationInbox,
  NotificationReadResult,
} from "@rahal/contracts";
import { createHmac } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { loadApiConfig } from "../config";
import { StaffAccessService } from "../staff/staff-access.service";
import type {
  CreateNotificationCampaignDto,
  RemovePushSubscriptionDto,
  SavePushSubscriptionDto,
  SearchNotificationRecipientsDto,
} from "./notifications.dto";
import { NotificationsRepository } from "./notifications.repository";
import { PushSubscriptionCryptoService } from "./push-subscription-crypto.service";

@Injectable()
export class NotificationsService {
  private readonly config = loadApiConfig();

  constructor(
    private readonly auth: AuthService,
    private readonly notifications: NotificationsRepository,
    private readonly access: StaffAccessService,
    private readonly pushCrypto: PushSubscriptionCryptoService = new PushSubscriptionCryptoService(),
  ) {}

  async inbox(token: string | undefined, requestedLocale?: string): Promise<NotificationInbox> {
    const session = await this.auth.getSession(token);
    const locale =
      requestedLocale === "ar" || requestedLocale === "en"
        ? requestedLocale
        : session.user.preferredLocale === "ar"
          ? "ar"
          : "en";
    const inbox = await this.notifications.inbox(session.user.id);
    return {
      unreadCount: inbox.unreadCount,
      items: inbox.items.map((item) => ({
        id: item.id,
        eventKey: item.eventKey,
        title: locale === "ar" ? item.titleAr : item.titleEn,
        body: locale === "ar" ? item.bodyAr : item.bodyEn,
        important: item.important,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        target: item.reservationId
          ? { kind: "RESERVATION" as const, id: item.reservationId }
          : item.targetPath
            ? { kind: "URL" as const, path: item.targetPath }
            : null,
      })),
    };
  }

  async markRead(token: string | undefined, id: string): Promise<NotificationReadResult> {
    const session = await this.auth.getSession(token);
    const result = await this.notifications.markRead(id, session.user.id, new Date());
    if (!result?.readAt) throw new NotFoundException("The notification was not found.");
    return { id: result.id, readAt: result.readAt.toISOString() };
  }

  async markAllRead(token: string | undefined) {
    const session = await this.auth.getSession(token);
    const result = await this.notifications.markAllRead(session.user.id, new Date());
    return { readAt: result.readAt.toISOString() };
  }

  pushPublicKey() {
    return this.pushCrypto.publicKey();
  }

  async savePushSubscription(
    token: string | undefined,
    input: SavePushSubscriptionDto,
    userAgent?: string,
  ) {
    const session = await this.auth.getSession(token);
    if (!this.pushCrypto.available()) {
      throw new NotFoundException("Browser push is not available.");
    }
    await this.notifications.savePushSubscription({
      userId: session.user.id,
      tokenHash: this.pushTokenHash(input.endpoint),
      subscriptionCiphertext: this.pushCrypto.encrypt(session.user.id, {
        endpoint: input.endpoint,
        keys: { p256dh: input.p256dh, auth: input.auth },
      }),
      userAgent: userAgent?.slice(0, 500),
    });
    return { enabled: true };
  }

  async removePushSubscription(token: string | undefined, input: RemovePushSubscriptionDto) {
    const session = await this.auth.getSession(token);
    await this.notifications.removePushSubscription(
      session.user.id,
      this.pushTokenHash(input.endpoint),
    );
    return { enabled: false };
  }

  async campaigns(
    token: string | undefined,
    requestedLocale?: string,
  ): Promise<NotificationCampaignPage> {
    const session = await this.auth.getSession(token);
    await this.access.require(session, "notifications.send");
    const locale =
      requestedLocale === "ar" || requestedLocale === "en"
        ? requestedLocale
        : session.user.preferredLocale === "ar"
          ? "ar"
          : "en";
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    const campaigns = await this.notifications.campaigns(isAdmin ? undefined : session.user.id);
    return {
      items: campaigns.map((campaign) => ({
        id: campaign.id,
        category: campaign.category as NotificationCampaignPage["items"][number]["category"],
        audience: campaign.audience as NotificationCampaignPage["items"][number]["audience"],
        title: locale === "ar" ? campaign.titleAr : campaign.titleEn,
        body: locale === "ar" ? campaign.bodyAr : campaign.bodyEn,
        targetPath: campaign.targetPath,
        channels: campaign.channels.flatMap((channel) =>
          channel === "IN_APP" || channel === "PUSH" || channel === "EMAIL" ? [channel] : [],
        ),
        important: campaign.important,
        marketing: campaign.marketing,
        recipientCount: campaign.recipientCount,
        createdBy:
          locale === "ar" && campaign.createdBy.fullNameAr
            ? campaign.createdBy.fullNameAr
            : campaign.createdBy.fullNameEn,
        createdAt: campaign.createdAt.toISOString(),
        delivery: campaign.delivery,
      })),
      capabilities: {
        audiences: isAdmin ? ["CUSTOMERS", "SALES", "CUSTOMERS_AND_SALES"] : ["CUSTOMERS"],
        channels: ["IN_APP", "PUSH", "EMAIL"],
      },
    };
  }

  async campaignRecipients(
    token: string | undefined,
    input: SearchNotificationRecipientsDto,
  ): Promise<NotificationCampaignRecipientPage> {
    const session = await this.auth.getSession(token);
    await this.access.require(session, "notifications.send");
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    const locale = input.locale === "ar" ? "ar" : "en";
    const recipients = await this.notifications.campaignRecipientOptions({
      query: input.query?.trim(),
      roles: isAdmin ? ["CUSTOMER", "SALES"] : ["CUSTOMER"],
    });
    return {
      items: recipients.map((recipient) => ({
        id: recipient.id,
        name: locale === "ar" && recipient.fullNameAr ? recipient.fullNameAr : recipient.fullNameEn,
        role: recipient.systemRole as "CUSTOMER" | "SALES",
        maskedContact: maskRecipientContact(recipient.email, recipient.phone),
        marketingEnabled: Boolean(recipient.notificationPreference?.marketingEnabled),
      })),
    };
  }

  async createCampaign(
    token: string | undefined,
    input: CreateNotificationCampaignDto,
  ): Promise<NotificationCampaignCreateResult> {
    const session = await this.auth.getSession(token);
    await this.access.require(session, "notifications.send");
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    if (!isAdmin && !input.recipientId && input.audience !== "CUSTOMERS") {
      throw new ForbiddenException("Sales employees may send campaigns to customers only.");
    }
    const marketing =
      input.marketing || input.category === "NEW_VEHICLE" || input.category === "OFFER";
    const marketingSince = marketing ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000) : undefined;
    const recipients = input.recipientId
      ? await this.notifications.campaignRecipientById({
          id: input.recipientId,
          roles: isAdmin ? ["CUSTOMER", "SALES"] : ["CUSTOMER"],
          marketing,
          marketingSince,
        })
      : await this.notifications.campaignRecipients({
          audience: input.audience,
          marketing,
          marketingSince,
        });
    if (!recipients.length) {
      throw new BadRequestException(
        marketing
          ? "No eligible recipients have opted in to marketing updates, or they already received a campaign in the last 7 days."
          : "No active recipients match this audience.",
      );
    }
    const channels = [...new Set(input.channels)];
    const result = await this.notifications.createCampaign({
      actorId: session.user.id,
      category: input.category,
      audience: input.recipientId ? "INDIVIDUAL" : input.audience,
      titleAr: input.titleAr.trim(),
      titleEn: input.titleEn.trim(),
      bodyAr: input.bodyAr.trim(),
      bodyEn: input.bodyEn.trim(),
      targetPath: input.targetPath?.trim() || undefined,
      channels,
      important: input.important || input.category === "URGENT",
      marketing,
      recipientIds: recipients.map((recipient) => recipient.id),
    });
    return {
      ...result,
      queuedDeliveries: result.recipientCount * channels.length,
      createdAt: result.createdAt.toISOString(),
    };
  }

  private pushTokenHash(endpoint: string) {
    return createHmac("sha256", this.config.authSecret).update(endpoint).digest("hex");
  }
}

function maskRecipientContact(email: string, phone: string | null) {
  if (email) {
    const [local = "", domain = ""] = email.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return phone && phone.length > 4 ? `${phone.slice(0, 3)}***${phone.slice(-2)}` : "***";
}
