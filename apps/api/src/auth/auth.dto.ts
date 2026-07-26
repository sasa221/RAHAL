import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

const phonePattern = /^\+?[1-9]\d{7,14}$/;

export class RegisterDto {
  @IsString()
  @Length(2, 100)
  fullNameEn!: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullNameAr?: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Matches(phonePattern, { message: "phone must use a valid international number format" })
  phone!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsIn(["ar", "en"])
  preferredLocale!: "ar" | "en";
}

export class LoginDto {
  @IsString()
  @MaxLength(254)
  identifier!: string;

  @IsString()
  @Length(1, 128)
  password!: string;
}

export class RequestVerificationDto {
  @IsIn(["email", "phone"])
  channel!: "email" | "phone";
}

export class ConfirmVerificationDto extends RequestVerificationDto {
  @Matches(/^\d{6}$/, { message: "code must contain exactly six digits" })
  code!: string;
}

export class RequestPasswordResetDto {
  @IsString()
  @MaxLength(254)
  identifier!: string;
}

export class ConfirmPasswordResetDto extends RequestPasswordResetDto {
  @Matches(/^\d{6}$/, { message: "code must contain exactly six digits" })
  code!: string;

  @IsString()
  @Length(8, 128)
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(1, 128)
  currentPassword!: string;

  @IsString()
  @Length(8, 128)
  newPassword!: string;
}
