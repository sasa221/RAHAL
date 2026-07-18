import { Injectable } from "@nestjs/common";
import type { BranchSummary } from "@rahal/contracts";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class BranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<BranchSummary[]> {
    return this.prisma.client.branch.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        addressAr: true,
        addressEn: true,
        active: true,
      },
    });
  }
}
