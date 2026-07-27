import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AdminDocumentRequirementOverview,
  AdminDocumentRequirementRule,
  AuthSession,
} from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import type {
  CreateDocumentRequirementDto,
  UpdateDocumentRequirementDto,
} from "./document-requirements.dto";
import { DocumentRequirementsRepository } from "./document-requirements.repository";

@Injectable()
export class DocumentRequirementsService {
  constructor(
    private readonly auth: AuthService,
    private readonly requirements: DocumentRequirementsRepository,
  ) {}

  async overview(token: string | undefined): Promise<AdminDocumentRequirementOverview> {
    await this.requireAdmin(token);
    return toOverview(await this.requirements.list());
  }

  async create(
    token: string | undefined,
    input: CreateDocumentRequirementDto,
  ): Promise<AdminDocumentRequirementRule> {
    const session = await this.requireAdmin(token);
    const identity = {
      customerCategory: input.customerCategory,
      documentType: input.documentType,
      requiresSelfDrive: input.requiresSelfDrive,
    };
    if (await this.requirements.findEquivalent(identity)) {
      throw new ConflictException("This document rule already exists for the selected scenario.");
    }
    try {
      return await this.requirements.create(
        { ...identity, key: createRuleKey(identity) },
        toWrite(input),
        session.user.id,
        input.reason.trim(),
      );
    } catch (error) {
      throwRuleConflict(error);
    }
  }

  async update(
    token: string | undefined,
    id: string,
    input: UpdateDocumentRequirementDto,
  ): Promise<AdminDocumentRequirementRule> {
    const session = await this.requireAdmin(token);
    const existing = await this.requirements.find(id);
    if (!existing) throw new NotFoundException("The document requirement rule was not found.");
    if (
      existing.active &&
      !input.active &&
      !existing.requiresSelfDrive &&
      (await this.requirements.countOtherBaseRules(existing.customerCategory, existing.id)) === 0
    ) {
      throw new ConflictException(
        "Each customer category must keep at least one active base document.",
      );
    }
    return this.requirements.update(
      existing.id,
      toWrite(input),
      session.user.id,
      input.reason.trim(),
    );
  }

  private async requireAdmin(token: string | undefined): Promise<AuthSession> {
    const session = await this.auth.getSession(token);
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      throw new ForbiddenException("Only administrators can manage document requirement rules.");
    }
    return session;
  }
}

function toWrite(input: UpdateDocumentRequirementDto) {
  return {
    labelAr: input.labelAr.trim(),
    labelEn: input.labelEn.trim(),
    allowedMimeTypes: [...input.allowedMimeTypes],
    maxSizeBytes: input.maxSizeBytes,
    active: input.active,
    sortOrder: input.sortOrder,
  };
}

function toOverview(rules: AdminDocumentRequirementRule[]): AdminDocumentRequirementOverview {
  const active = rules.filter((rule) => rule.active);
  return {
    rules,
    summary: {
      activeRules: active.length,
      egyptianRules: active.filter((rule) => rule.customerCategory === "EGYPTIAN").length,
      foreignRules: active.filter((rule) => rule.customerCategory === "FOREIGN").length,
      selfDriveRules: active.filter((rule) => rule.requiresSelfDrive).length,
    },
  };
}

function createRuleKey(identity: {
  customerCategory: string;
  documentType: string;
  requiresSelfDrive: boolean;
}) {
  return [
    identity.customerCategory.toLowerCase(),
    identity.documentType.toLowerCase().replaceAll("_", "-"),
    identity.requiresSelfDrive ? "self-drive" : "base",
  ].join("-");
}

function throwRuleConflict(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    throw new ConflictException("This document rule already exists for the selected scenario.");
  }
  throw error;
}
