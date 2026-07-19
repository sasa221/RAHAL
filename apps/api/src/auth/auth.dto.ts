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
  @Length(12, 128)
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
