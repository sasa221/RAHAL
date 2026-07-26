import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AccountController } from "./account.controller";
import { AccountRepository } from "./account.repository";
import { AccountService } from "./account.service";

@Module({
  imports: [AuthModule],
  controllers: [AccountController],
  providers: [AccountRepository, AccountService],
})
export class AccountModule {}
