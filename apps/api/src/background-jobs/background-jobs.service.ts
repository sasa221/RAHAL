import { Injectable, Logger } from "@nestjs/common";
import { NotificationOutboxService } from "../notifications/notification-outbox.service";
import { ReservationExpiryService } from "../reservations/reservation-expiry.service";

@Injectable()
export class BackgroundJobsService {
  private readonly logger = new Logger(BackgroundJobsService.name);

  constructor(
    private readonly outbox: NotificationOutboxService,
    private readonly reservationExpiry: ReservationExpiryService,
  ) {}

  async runScheduledBatch() {
    const expiry = await this.reservationExpiry.sweepExpiredReviewWindows();
    const outbox = await this.outbox.drainBatch(50);
    return { expiry, outbox };
  }

  async runRequestBatch() {
    try {
      return await this.outbox.drainBatch(5);
    } catch (error) {
      this.logger.warn({
        event: "request_outbox_drain_failed",
        error: error instanceof Error ? error.message.slice(0, 120) : "Unknown outbox error.",
      });
      return { processed: 0 };
    }
  }

  async runDeliveryBatch(limit = 50) {
    return this.outbox.drainBatch(limit);
  }
}
