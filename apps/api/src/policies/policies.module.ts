import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PoliciesController } from "./policies.controller";
import { PoliciesRepository } from "./policies.repository";
import { PoliciesService } from "./policies.service";

@Module({
  imports: [AuthModule],
  controllers: [PoliciesController],
  providers: [PoliciesRepository, PoliciesService],
})
export class PoliciesModule {}
