import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DocumentRequirementsController } from "./document-requirements.controller";
import { DocumentRequirementsRepository } from "./document-requirements.repository";
import { DocumentRequirementsService } from "./document-requirements.service";

@Module({
  imports: [AuthModule],
  controllers: [DocumentRequirementsController],
  providers: [DocumentRequirementsRepository, DocumentRequirementsService],
})
export class DocumentRequirementsModule {}
