import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { BranchWorkingHours } from "@rahal/contracts";
import type { Prisma } from "@rahal/database";
import { AuthService } from "../auth/auth.service";
import { StaffAccessService } from "../staff/staff-access.service";
import type { BranchActionDto, SaveBranchDto } from "./branches.dto";
import { BranchesRepository } from "./branches.repository";

@Injectable()
export class BranchesService {
  constructor(
    private readonly branches: BranchesRepository,
    private readonly auth: AuthService,
    private readonly access: StaffAccessService,
  ) {}

  list() {
    return this.branches.list();
  }

  async adminList(token: string | undefined) {
    const session = await this.require(token, "branches.view");
    const [overview, edit, create, disable, remove] = await Promise.all([
      this.branches.adminOverview(),
      this.access.allows(session, "branches.edit"),
      this.access.allows(session, "branches.create"),
      this.access.allows(session, "branches.disable"),
      this.access.allows(session, "branches.delete"),
    ]);
    return { ...overview, permissions: { view: true, edit, create, disable, delete: remove } };
  }

  async create(token: string | undefined, input: SaveBranchDto) {
    const session = await this.require(token, "branches.create");
    return this.branches.create(normalizeBranch(input), session.user.id);
  }

  async update(token: string | undefined, id: string, input: SaveBranchDto) {
    const session = await this.require(token, "branches.edit");
    const previous = await this.branches.findStatus(id);
    if (!previous) throw new NotFoundException("The branch was not found.");
    if (previous.status === "ACTIVE" && input.status === "INACTIVE")
      await this.access.require(session, "branches.disable");
    const branch = await this.branches.update(id, normalizeBranch(input), session.user.id);
    if (!branch) throw new NotFoundException("The branch was not found.");
    return branch;
  }

  async disable(token: string | undefined, id: string, input: BranchActionDto) {
    const session = await this.require(token, "branches.disable");
    const branch = await this.branches.setStatus(id, "INACTIVE", session.user.id, input.reason);
    if (!branch) throw new NotFoundException("The branch was not found.");
    return branch;
  }

  async delete(token: string | undefined, id: string, input: BranchActionDto) {
    const session = await this.require(token, "branches.delete");
    const result = await this.branches.deleteUnreferenced(id, session.user.id, input.reason);
    if (result === "NOT_FOUND") throw new NotFoundException("The branch was not found.");
    if (result === "REFERENCED")
      throw new ConflictException(
        "This branch is linked to vehicles, requests, or bookings and cannot be deleted. Disable it instead.",
      );
    return { deleted: true as const };
  }

  private async require(
    token: string | undefined,
    permission: Parameters<StaffAccessService["require"]>[1],
  ) {
    const session = await this.auth.getSession(token);
    await this.access.require(session, permission);
    return session;
  }
}

function normalizeBranch(input: SaveBranchDto) {
  if ((input.latitude == null) !== (input.longitude == null))
    throw new BadRequestException("Latitude and longitude must be provided together.");
  const whatsappNumber = input.whatsappNumber?.replace(/[\s()-]/g, "") || null;
  return {
    nameAr: input.nameAr.trim(),
    nameEn: input.nameEn.trim(),
    governorateAr: input.governorateAr.trim(),
    governorateEn: input.governorateEn.trim(),
    areaAr: input.areaAr.trim(),
    areaEn: input.areaEn.trim(),
    streetAr: input.streetAr.trim(),
    streetEn: input.streetEn.trim(),
    landmarkAr: input.landmarkAr?.trim() || null,
    landmarkEn: input.landmarkEn?.trim() || null,
    addressAr: input.addressAr.trim(),
    addressEn: input.addressEn.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    phones: [...new Set(input.phones.map((phone) => phone.replace(/[\s()-]/g, "")))],
    whatsappNumbers: whatsappNumber ? [whatsappNumber] : [],
    whatsappNumber,
    whatsappVisible: Boolean(input.whatsappVisible && whatsappNumber),
    whatsappMessageAr: input.whatsappMessageAr?.trim() || null,
    whatsappMessageEn: input.whatsappMessageEn?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    socialLinks: normalizeSocialLinks(input.socialLinks) as Prisma.InputJsonArray,
    workingHours: normalizeWorkingHours(input.workingHours) as unknown as Prisma.InputJsonObject,
    services: [
      ...new Set(input.services.map((service) => service.trim()).filter(Boolean)),
    ] as Prisma.InputJsonArray,
    managerId: input.managerId || null,
    status: input.status,
    active: input.status === "ACTIVE",
  };
}

function normalizeWorkingHours(value: Record<string, unknown>): BranchWorkingHours {
  const weekly = Array.isArray(value.weekly) ? value.weekly : [];
  if (weekly.length !== 7) throw new BadRequestException("Working hours require all seven days.");
  const days = new Set<string>();
  const normalizedWeekly = weekly.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new BadRequestException("Working day is invalid.");
    const row = raw as Record<string, unknown>;
    const day = String(row.day);
    if (
      !["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(
        day,
      ) ||
      days.has(day)
    )
      throw new BadRequestException("Working days must be unique and complete.");
    days.add(day);
    const closed = Boolean(row.closed);
    const opensAt = closed ? null : validTime(row.opensAt, "opening time");
    const closesAt = closed ? null : validTime(row.closesAt, "closing time");
    if (!closed && opensAt! >= closesAt!)
      throw new BadRequestException("Closing time must be after opening time.");
    return { day: day as BranchWorkingHours["weekly"][number]["day"], closed, opensAt, closesAt };
  });
  const exceptions = Array.isArray(value.exceptions)
    ? value.exceptions.map(normalizeException)
    : [];
  return { timezone: "Africa/Cairo", weekly: normalizedWeekly, exceptions };
}

function normalizeException(raw: unknown, index: number): BranchWorkingHours["exceptions"][number] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new BadRequestException("Hours exception is invalid.");
  const row = raw as Record<string, unknown>;
  const date = String(row.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new BadRequestException("Exception date is invalid.");
  const closed = Boolean(row.closed);
  return {
    id: typeof row.id === "string" && row.id ? row.id : `exception-${index + 1}`,
    date,
    labelAr: String(row.labelAr ?? "").trim(),
    labelEn: String(row.labelEn ?? "").trim(),
    closed,
    opensAt: closed ? null : validTime(row.opensAt, "exception opening time"),
    closesAt: closed ? null : validTime(row.closesAt, "exception closing time"),
  };
}

function normalizeSocialLinks(values: Array<Record<string, unknown>>) {
  return values.map((row, index) => {
    const url = String(row.url ?? "").trim();
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      throw new BadRequestException("Social links must use valid HTTP or HTTPS URLs.");
    }
    return {
      id: String(row.id || `social-${index + 1}`),
      platform: String(row.platform ?? "").trim(),
      url,
    };
  });
}

function validTime(value: unknown, label: string) {
  const text = String(value ?? "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text))
    throw new BadRequestException(`${label} is invalid.`);
  return text;
}
