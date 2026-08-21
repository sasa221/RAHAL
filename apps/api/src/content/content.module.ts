import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StaffModule } from "../staff/staff.module";
import { ContentController } from "./content.controller";
import { ContentRepository } from "./content.repository";
import { ContentService } from "./content.service";

@Module({
  imports: [AuthModule, StaffModule],
  controllers: [ContentController],
  providers: [ContentRepository, ContentService],
})
export class ContentModule {}
