import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StaffModule } from "../staff/staff.module";
import { BranchesController } from "./branches.controller";
import { BranchesRepository } from "./branches.repository";
import { BranchesService } from "./branches.service";

@Module({
  imports: [AuthModule, StaffModule],
  controllers: [BranchesController],
  providers: [BranchesRepository, BranchesService],
})
export class BranchesModule {}
