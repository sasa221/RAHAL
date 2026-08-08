import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  Length,
  ValidateNested,
} from "class-validator";

export const siteContentKeys = [
  "HOME_HERO",
  "HOME_PROCESS",
  "HOME_TRUST",
  "ABOUT",
  "HOW_IT_WORKS",
  "FAQ",
  "CONTACT",
] as const;

export class SiteContentItemDto {
  @IsString()
  @Length(2, 160)
  title!: string;

  @IsString()
  @Length(10, 2_000)
  body!: string;
}

export class SiteContentTranslationDto {
  @IsIn(["ar", "en"])
  locale!: "ar" | "en";

  @IsString()
  @Length(2, 100)
  eyebrow!: string;

  @IsString()
  @Length(4, 180)
  title!: string;

  @IsString()
  @Length(20, 1_500)
  introduction!: string;

  @IsString()
  @Length(10, 1_000)
  statement!: string;

  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => SiteContentItemDto)
  items!: SiteContentItemDto[];
}

export class SaveSiteContentDto {
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => SiteContentTranslationDto)
  translations!: SiteContentTranslationDto[];

  @IsString()
  @Length(5, 300)
  reason!: string;
}

export class PublishSiteContentDto {
  @IsString()
  @Length(10, 300)
  reason!: string;
}
