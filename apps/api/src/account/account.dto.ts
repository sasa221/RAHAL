import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class UpdateCustomerProfileDto {
  @IsString()
  @Length(2, 120)
  fullNameEn!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullNameAr?: string | null;

  @IsIn(["ar", "en"])
  preferredLocale!: "ar" | "en";

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  nationality?: string | null;

  @IsOptional()
  @IsString()
  @Length(10, 300)
  address?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  emergencyContactName?: string | null;

  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/)
  emergencyContactPhone?: string | null;
}

export class UpdateNotificationPreferencesDto {
  @IsBoolean()
  emailEnabled!: boolean;

  @IsBoolean()
  pushEnabled!: boolean;

  @IsBoolean()
  marketingEnabled!: boolean;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  quietHoursStart?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  quietHoursEnd?: string | null;
}
