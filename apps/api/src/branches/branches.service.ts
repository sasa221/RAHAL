import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@rahal/database";
import { AuthService } from "../auth/auth.service";
import type { SaveBranchDto } from "./branches.dto";
import { BranchesRepository } from "./branches.repository";

@Injectable()
export class BranchesService {
  constructor(
    private readonly branches: BranchesRepository,
    private readonly auth: AuthService,
  ) {}

  list() {
    return this.branches.list();
  }

  async adminList(token: string | undefined) {
    await this.requireAdmin(token);
    return this.branches.adminList();
  }

  async create(token: string | undefined, input: SaveBranchDto) {
    const session = await this.requireAdmin(token);
    return this.branches.create(normalizeBranch(input), session.user.id);
  }

  async update(token: string | undefined, id: string, input: SaveBranchDto) {
    const session = await this.requireAdmin(token);
    const branch = await this.branches.update(id, normalizeBranch(input), session.user.id);
    if (!branch) throw new NotFoundException("The branch was not found.");
    return branch;
  }

  private async requireAdmin(token: string | undefined) {
    const session = await this.auth.getSession(token);
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      throw new ForbiddenException("Only administrators can manage branches.");
    }
    return session;
  }
}

function normalizeBranch(input: SaveBranchDto) {
  return {
    nameAr: input.nameAr.trim(),
    nameEn: input.nameEn.trim(),
    addressAr: input.addressAr.trim(),
    addressEn: input.addressEn.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    phones: [...new Set(input.phones.map((phone) => phone.trim()))],
    whatsappNumbers: [...new Set(input.whatsappNumbers.map((phone) => phone.trim()))],
    workingHours: input.workingHours as Prisma.InputJsonObject,
    active: input.active,
  };
}
