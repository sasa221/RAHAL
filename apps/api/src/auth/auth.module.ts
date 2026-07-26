import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthRateLimitService } from "./auth-rate-limit.service";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";

@Module({
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, PasswordService, AuthRateLimitService],
  exports: [AuthService, PasswordService],
})
export class AuthModule {}
