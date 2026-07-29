import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

export class SaveBranchDto {
  @IsString()
  @Length(2, 120)
  nameAr!: string;

  @IsString()
  @Length(2, 120)
  nameEn!: string;

  @IsString()
  @Length(5, 500)
  addressAr!: string;

  @IsString()
  @Length(5, 500)
  addressEn!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { each: true })
  phones!: string[];

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { each: true })
  whatsappNumbers!: string[];

  @IsObject()
  workingHours!: Record<string, unknown>;

  @IsBoolean()
  active!: boolean;
}
