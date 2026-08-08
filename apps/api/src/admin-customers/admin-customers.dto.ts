import { IsIn, IsString, Length } from "class-validator";

export class UpdateCustomerStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED", "BLOCKED"])
  status!: "ACTIVE" | "SUSPENDED" | "BLOCKED";

  @IsString()
  @Length(10, 300)
  reason!: string;
}
