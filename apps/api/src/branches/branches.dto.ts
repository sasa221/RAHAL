import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class SaveBranchDto {
  @IsString() @Length(2, 120) nameAr!: string;
  @IsString() @Length(2, 120) nameEn!: string;
  @IsString() @Length(2, 120) governorateAr!: string;
  @IsString() @Length(2, 120) governorateEn!: string;
  @IsString() @Length(2, 160) areaAr!: string;
  @IsString() @Length(2, 160) areaEn!: string;
  @IsString() @Length(2, 240) streetAr!: string;
  @IsString() @Length(2, 240) streetEn!: string;
  @IsOptional() @IsString() @MaxLength(240) landmarkAr?: string;
  @IsOptional() @IsString() @MaxLength(240) landmarkEn?: string;
  @IsString() @Length(5, 500) addressAr!: string;
  @IsString() @Length(5, 500) addressEn!: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 7 }) @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 7 }) @Min(-180) @Max(180) longitude?: number;
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^\+[1-9]\d{7,14}$/, { each: true })
  phones!: string[];
  @IsOptional() @IsString() @Matches(/^\+[1-9]\d{7,14}$/) whatsappNumber?: string;
  @IsBoolean() whatsappVisible!: boolean;
  @IsOptional() @IsString() @MaxLength(300) whatsappMessageAr?: string;
  @IsOptional() @IsString() @MaxLength(300) whatsappMessageEn?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsArray() @ArrayMaxSize(10) @IsObject({ each: true }) socialLinks!: Array<
    Record<string, unknown>
  >;
  @IsObject() workingHours!: Record<string, unknown>;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) services!: string[];
  @IsOptional() @IsString() managerId?: string;
  @IsIn(["DRAFT", "ACTIVE", "INACTIVE"]) status!: "DRAFT" | "ACTIVE" | "INACTIVE";
}

export class BranchActionDto {
  @IsString() @Length(5, 300) reason!: string;
}
