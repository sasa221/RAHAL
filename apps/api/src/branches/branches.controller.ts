import { Controller, Get } from "@nestjs/common";
import type { ApiSuccess, BranchSummary } from "@rahal/contracts";
import { BranchesService } from "./branches.service";

@Controller("branches")
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  async list(): Promise<ApiSuccess<BranchSummary[]>> {
    const data = await this.branches.list();
    return { data, meta: { source: "database", total: data.length } };
  }
}
