import { IsIn, IsString, Length } from "class-validator";

export class UpdateCustomerStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED", "BLOCKED"])
  status!: "ACTIVE" | "SUSPENDED" | "BLOCKED";

  @IsString()
  @Length(10, 300)
  reason!: string;
}

export class CustomerContactAccessDto {
  @IsIn(["VIEW", "CALL", "EMAIL", "WHATSAPP", "COPY_EMAIL", "COPY_PHONE"])
  action!: "VIEW" | "CALL" | "EMAIL" | "WHATSAPP" | "COPY_EMAIL" | "COPY_PHONE";

  @IsString()
  @Length(10, 300)
  reason!: string;
}
