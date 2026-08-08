import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminCustomersController } from "./admin-customers.controller";
import { AdminCustomersRepository } from "./admin-customers.repository";
import { AdminCustomersService } from "./admin-customers.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminCustomersController],
  providers: [AdminCustomersRepository, AdminCustomersService],
})
export class AdminCustomersModule {}
