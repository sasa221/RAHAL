import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

const permissionKeys = [
  "reservations.view",
  "reservations.review",
  "documents.view",
  "documents.review",
  "deposits.record",
  "bookings.confirm",
  "bookings.operate",
  "fleet.view",
  "fleet.manage",
  "vehicles.manage",
  "staff.manage",
  "audit.view",
] as const;

export class CreateStaffDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Matches(/^\+[1-9]\d{7,14}$/)
  phone!: string;

  @IsString()
  @Length(2, 120)
  fullNameEn!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullNameAr?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  temporaryPassword!: string;

  @IsIn(["ar", "en"])
  preferredLocale!: "ar" | "en";

  @IsIn(["SALES", "ADMIN"])
  systemRole!: "SALES" | "ADMIN";

  @IsOptional()
  @IsString()
  staffRoleId?: string;

  @IsString()
  @Length(10, 300)
  reason!: string;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullNameEn?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullNameAr?: string;

  @IsOptional()
  @IsIn(["ar", "en"])
  preferredLocale?: "ar" | "en";

  @IsOptional()
  @IsIn(["SALES", "ADMIN"])
  systemRole?: "SALES" | "ADMIN";

  @IsOptional()
  @IsIn(["ACTIVE", "SUSPENDED", "BLOCKED"])
  status?: "ACTIVE" | "SUSPENDED" | "BLOCKED";

  @IsOptional()
  @IsString()
  staffRoleId?: string | null;

  @IsString()
  @Length(10, 300)
  reason!: string;
}

export class ResetStaffAccessDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  temporaryPassword!: string;

  @IsString()
  @Length(10, 300)
  reason!: string;
}

export class StaffOverrideDto {
  @IsIn(permissionKeys)
  permissionKey!: (typeof permissionKeys)[number];

  @IsIn([true, false])
  allowed!: boolean;
}

export class UpdateStaffPermissionsDto {
  @IsArray()
  @ArrayMaxSize(permissionKeys.length)
  @ValidateNested({ each: true })
  @Type(() => StaffOverrideDto)
  overrides!: StaffOverrideDto[];

  @IsString()
  @Length(10, 300)
  reason!: string;
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayMaxSize(permissionKeys.length)
  @IsIn(permissionKeys, { each: true })
  permissionKeys!: Array<(typeof permissionKeys)[number]>;

  @IsString()
  @Length(10, 300)
  reason!: string;
}
