import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { ReservationsRepository } from "./reservations.repository";

const sweepIntervalMs = 60_000;

@Injectable()
export class ReservationExpiryService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ReservationExpiryService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(private readonly reservations: ReservationsRepository) {}

  onApplicationBootstrap() {
    void this.sweepExpiredReviewWindows();
    this.timer = setInterval(() => void this.sweepExpiredReviewWindows(), sweepIntervalMs);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async sweepExpiredReviewWindows(now = new Date()) {
    if (this.running) return { expiredOffers: 0, expiredPreApprovals: 0 };
    this.running = true;
    try {
      const result = await this.reservations.expireStaleReviewWindows(now);
      if (result.expiredOffers || result.expiredPreApprovals) {
        this.logger.log(
          `Expired ${result.expiredOffers} alternative offer(s) and ${result.expiredPreApprovals} pre-approval(s).`,
        );
      }
      return result;
    } catch (error) {
      this.logger.error("Reservation expiry sweep failed.", error);
      return { expiredOffers: 0, expiredPreApprovals: 0 };
    } finally {
      this.running = false;
    }
  }
}
