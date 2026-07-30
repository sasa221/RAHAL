import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { loadApiConfig } from "../config";
import { PrivateDocumentStorage } from "./private-document-storage";
import { ReservationsRepository } from "./reservations.repository";

const sweepIntervalMs = 60_000;

@Injectable()
export class ReservationExpiryService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ReservationExpiryService.name);
  private readonly config = loadApiConfig();
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    private readonly reservations: ReservationsRepository,
    private readonly documentStorage: PrivateDocumentStorage = new PrivateDocumentStorage(),
  ) {}

  onApplicationBootstrap() {
    if (this.config.backgroundJobs.mode !== "interval") return;
    void this.sweepExpiredReviewWindows();
    this.timer = setInterval(() => void this.sweepExpiredReviewWindows(), sweepIntervalMs);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async sweepExpiredReviewWindows(now = new Date()) {
    if (this.running) return { expiredDrafts: 0, expiredOffers: 0, expiredPreApprovals: 0 };
    this.running = true;
    try {
      const result = await this.reservations.expireStaleReviewWindows(now);
      await Promise.allSettled(
        result.removedDraftStorageKeys.map((storageKey) => this.documentStorage.remove(storageKey)),
      );
      const summary = {
        expiredDrafts: result.expiredDrafts,
        expiredOffers: result.expiredOffers,
        expiredPreApprovals: result.expiredPreApprovals,
      };
      if (summary.expiredDrafts || summary.expiredOffers || summary.expiredPreApprovals) {
        this.logger.log(
          `Expired ${summary.expiredDrafts} draft(s), ${summary.expiredOffers} alternative offer(s), and ${summary.expiredPreApprovals} pre-approval(s).`,
        );
      }
      return summary;
    } catch (error) {
      this.logger.error("Reservation expiry sweep failed.", error);
      return { expiredDrafts: 0, expiredOffers: 0, expiredPreApprovals: 0 };
    } finally {
      this.running = false;
    }
  }
}
