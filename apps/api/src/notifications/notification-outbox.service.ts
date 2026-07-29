import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as webPush from "web-push";
import { loadApiConfig } from "../config";
import { NotificationsRepository } from "./notifications.repository";
import { PushSubscriptionCryptoService } from "./push-subscription-crypto.service";

@Injectable()
export class NotificationOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationOutboxService.name);
  private readonly config = loadApiConfig();
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly notifications: NotificationsRepository,
    private readonly pushCrypto: PushSubscriptionCryptoService,
  ) {
    if (this.config.webPush) {
      webPush.setVapidDetails(
        this.config.webPush.subject,
        this.config.webPush.publicKey,
        this.config.webPush.privateKey,
      );
    }
  }

  onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => void this.drainOne(), 2_500);
    this.timer.unref();
    void this.drainOne();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async drainOne() {
    if (this.running) return false;
    this.running = true;
    try {
      const event = await this.notifications.claimNextEvent();
      if (!event) return false;
      try {
        const payload = asObject(event.payload);
        const userId =
          stringValue(payload.userId) ??
          stringValue(payload.customerId) ??
          stringValue(payload.assignedSalesId);
        if (!userId) throw new Error("Notification event has no recipient.");
        const reservationId = stringValue(payload.reservationId) ?? event.aggregateId;
        const notification = await this.notifications.deliveryContext(
          event.eventKey,
          reservationId,
          userId,
        );
        if (!notification) throw new Error("Notification record was not found.");
        const preference = notification.user.notificationPreference ?? {
          inAppEnabled: true,
          pushEnabled: true,
          emailEnabled: true,
          whatsappEnabled: true,
          quietHoursStart: null,
          quietHoursEnd: null,
        };
        const locale = notification.user.preferredLocale === "ar" ? "ar" : "en";
        const title = locale === "ar" ? notification.titleAr : notification.titleEn;
        const body = locale === "ar" ? notification.bodyAr : notification.bodyEn;
        const failures: string[] = [];

        if (preference.inAppEnabled) {
          await this.recordChannel(notification.id, "IN_APP", async () => ({
            providerId: "local",
          }));
        }
        const externalDeliveryExpected =
          (preference.emailEnabled && Boolean(notification.user.emailVerifiedAt)) ||
          (preference.whatsappEnabled && Boolean(notification.user.phoneVerifiedAt)) ||
          (preference.pushEnabled && notification.user.pushSubscriptions.length > 0);
        const quietUntil = externalDeliveryExpected
          ? quietHoursEnd(
              preference.quietHoursStart,
              preference.quietHoursEnd,
              new Date(),
              "Africa/Cairo",
            )
          : null;
        if (quietUntil) {
          await this.notifications.deferEvent(event.id, quietUntil);
          return true;
        }
        if (preference.emailEnabled && notification.user.emailVerifiedAt) {
          const result = await this.recordChannel(notification.id, "EMAIL", () =>
            this.sendEmail(
              notification.user.email,
              title,
              body,
              locale,
              notification.reservationId,
            ),
          );
          if (!result) failures.push("EMAIL");
        }
        if (preference.whatsappEnabled && notification.user.phoneVerifiedAt) {
          const result = await this.recordChannel(notification.id, "WHATSAPP", () =>
            this.sendWhatsApp(notification.user.phone, title, body, locale),
          );
          if (!result) failures.push("WHATSAPP");
        }
        if (preference.pushEnabled && notification.user.pushSubscriptions.length) {
          const result = await this.recordChannel(notification.id, "PUSH", () =>
            this.sendPush(
              notification.user.id,
              notification.user.pushSubscriptions,
              title,
              body,
              locale,
              notification.reservationId,
            ),
          );
          if (!result) failures.push("PUSH");
        }

        if (failures.length) {
          throw new Error(`Delivery failed for ${failures.join(",")}.`);
        }
        await this.notifications.markEventProcessed(event.id);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Notification delivery failed.";
        await this.notifications.retryEvent(event.id, event.attempts, message);
        this.logger.warn({
          event: "notification_delivery_retry",
          eventId: event.id,
          attempts: event.attempts,
          error: message.slice(0, 120),
        });
        return false;
      }
    } finally {
      this.running = false;
    }
  }

  private async recordChannel(
    notificationId: string,
    channel: "IN_APP" | "PUSH" | "EMAIL" | "WHATSAPP",
    deliver: () => Promise<{ providerId?: string }>,
  ) {
    const row = await this.notifications.upsertDelivery(notificationId, channel);
    if (row.status === "SENT") return true;
    try {
      const result = await deliver();
      await this.notifications.markDelivery(row.id, {
        status: "SENT",
        providerId: result.providerId,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider rejected delivery.";
      await this.notifications.markDelivery(row.id, {
        status: "FAILED",
        error: message,
      });
      return false;
    }
  }

  private async sendEmail(
    email: string,
    title: string,
    body: string,
    locale: "ar" | "en",
    reservationId: string | null,
  ) {
    const provider = this.config.verificationEmail;
    if (!provider) throw new Error("Email provider is not configured.");
    const target = reservationId
      ? `${this.config.webUrl}${locale === "en" ? "/en" : ""}/account/requests?request=${encodeURIComponent(reservationId)}`
      : `${this.config.webUrl}${locale === "en" ? "/en" : ""}/account/requests`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${provider.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: provider.from,
        to: [email],
        subject: title,
        text: `${body}\n\n${target}`,
        html: `<div dir="${locale === "ar" ? "rtl" : "ltr"}" style="font-family:Arial,sans-serif;line-height:1.7"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><p><a href="${escapeHtml(target)}">${locale === "ar" ? "فتح حساب رحال" : "Open your Rahal account"}</a></p></div>`,
      }),
    });
    if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}.`);
    const result = (await response.json()) as { id?: string };
    return { providerId: result.id };
  }

  private async sendWhatsApp(phone: string, title: string, body: string, locale: "ar" | "en") {
    const provider = this.config.verificationWhatsApp;
    if (!provider?.notificationTemplateName) {
      throw new Error("WhatsApp notification template is not configured.");
    }
    const response = await fetch(
      `https://graph.facebook.com/${provider.graphApiVersion}/${provider.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${provider.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/^\+/, ""),
          type: "template",
          template: {
            name: provider.notificationTemplateName,
            language: { code: locale === "ar" ? "ar" : "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: title.slice(0, 120) },
                  { type: "text", text: body.slice(0, 500) },
                ],
              },
            ],
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`WhatsApp provider returned HTTP ${response.status}.`);
    const result = (await response.json()) as { messages?: Array<{ id?: string }> };
    return { providerId: result.messages?.[0]?.id };
  }

  private async sendPush(
    userId: string,
    subscriptions: Array<{ id: string; subscriptionCiphertext: string | null }>,
    title: string,
    body: string,
    locale: "ar" | "en",
    reservationId: string | null,
  ) {
    if (!this.config.webPush) throw new Error("Web Push is not configured.");
    const url = `${locale === "en" ? "/en" : ""}/account/requests${
      reservationId ? `?request=${encodeURIComponent(reservationId)}` : ""
    }`;
    let delivered = 0;
    let providerId: string | undefined;
    for (const stored of subscriptions) {
      if (!stored.subscriptionCiphertext) continue;
      try {
        const subscription = this.pushCrypto.decrypt(userId, stored.subscriptionCiphertext);
        const result = await webPush.sendNotification(
          subscription,
          JSON.stringify({ title, body, url }),
          { TTL: 60 * 60, urgency: "high" },
        );
        delivered += 1;
        providerId ??= result.headers["x-request-id"]?.toString();
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await this.notifications.deactivatePushSubscription(stored.id);
        }
      }
    }
    if (!delivered) throw new Error("No browser push subscription accepted the message.");
    return { providerId };
  }
}

function asObject(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

export function quietHoursEnd(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date,
  timeZone: string,
) {
  const startMinutes = clockMinutes(start);
  const endMinutes = clockMinutes(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  const current = hour * 60 + minute;
  const active =
    startMinutes < endMinutes
      ? current >= startMinutes && current < endMinutes
      : current >= startMinutes || current < endMinutes;
  if (!active) return null;
  const minutesUntilEnd =
    current < endMinutes ? endMinutes - current : 24 * 60 - current + endMinutes;
  return new Date(now.getTime() + minutesUntilEnd * 60_000);
}

function clockMinutes(value: string | null | undefined) {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours! * 60 + minutes!;
}
