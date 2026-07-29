import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsISO8601,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from "class-validator";

const policyKeys = [
  "RENTAL_TERMS",
  "PRIVACY",
  "DOCUMENT_PROCESSING",
  "RESERVATION_PROCESS",
] as const;

export class PublishPolicyCopyDto {
  @IsIn(policyKeys)
  key!: (typeof policyKeys)[number];

  @IsIn(["ar", "en"])
  locale!: "ar" | "en";

  @IsString()
  @Length(4, 160)
  title!: string;

  @IsString()
  @Length(50, 12_000)
  body!: string;
}

export class PublishPolicyBundleDto {
  @IsString()
  @Length(3, 40)
  @Matches(/^[A-Z0-9][A-Z0-9._-]+$/)
  version!: string;

  @IsISO8601({ strict: true })
  effectiveAt!: string;

  @ArrayMinSize(8)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => PublishPolicyCopyDto)
  copies!: PublishPolicyCopyDto[];

  @IsString()
  @Length(10, 300)
  reason!: string;
}
