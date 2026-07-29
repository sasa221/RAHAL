import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { ManagedPolicyCopy } from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import type { PublishPolicyBundleDto } from "./policies.dto";
import { PoliciesRepository } from "./policies.repository";

const requiredKeys = [
  "RENTAL_TERMS",
  "PRIVACY",
  "DOCUMENT_PROCESSING",
  "RESERVATION_PROCESS",
] as const;

@Injectable()
export class PoliciesService {
  constructor(
    private readonly policies: PoliciesRepository,
    private readonly auth: AuthService,
  ) {}

  async overview(token: string | undefined) {
    await this.requireAdmin(token);
    return this.policies.overview();
  }

  async publish(token: string | undefined, input: PublishPolicyBundleDto) {
    const session = await this.requireAdmin(token);
    const version = input.version.trim().toUpperCase();
    if (version.startsWith("DEV-")) {
      throw new BadRequestException("Production policy versions cannot use the DEV- prefix.");
    }
    const effectiveAt = new Date(input.effectiveAt);
    const now = Date.now();
    if (effectiveAt.getTime() < now - 10 * 60_000 || effectiveAt.getTime() > now + 5 * 60_000) {
      throw new BadRequestException("The policy bundle must become effective immediately.");
    }
    const copies = input.copies.map((copy) => ({
      key: copy.key,
      locale: copy.locale,
      title: copy.title.trim(),
      body: copy.body.trim(),
    }));
    assertCompleteMatrix(copies);
    const published = await this.policies.publish({
      actorId: session.user.id,
      version,
      effectiveAt,
      reason: input.reason.trim(),
      copies,
    });
    if (!published) throw new ConflictException("This policy version already exists.");
    return this.policies.overview();
  }

  private async requireAdmin(token: string | undefined) {
    const session = await this.auth.getSession(token);
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      throw new ForbiddenException("Only administrators can publish policy bundles.");
    }
    return session;
  }
}

function assertCompleteMatrix(copies: ManagedPolicyCopy[]) {
  const unique = new Set(copies.map((copy) => `${copy.key}:${copy.locale}`));
  const expected = requiredKeys.flatMap((key) => [`${key}:ar`, `${key}:en`]);
  if (copies.length !== expected.length || expected.some((key) => !unique.has(key))) {
    throw new BadRequestException(
      "Arabic and English copy is required exactly once for every policy.",
    );
  }
}
