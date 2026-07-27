import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

const documentTypes = [
  "NATIONAL_ID_FRONT",
  "NATIONAL_ID_BACK",
  "DRIVING_LICENSE_FRONT",
  "DRIVING_LICENSE_BACK",
  "PASSPORT",
] as const;

const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"] as const;

class DocumentRequirementConfigurationDto {
  @IsString()
  @Length(2, 80)
  labelAr!: string;

  @IsString()
  @Length(2, 80)
  labelEn!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(allowedMimeTypes, { each: true })
  allowedMimeTypes!: Array<(typeof allowedMimeTypes)[number]>;

  @IsInt()
  @Min(1024 * 1024)
  @Max(20 * 1024 * 1024)
  maxSizeBytes!: number;

  @IsBoolean()
  active!: boolean;

  @IsInt()
  @Min(0)
  @Max(99)
  sortOrder!: number;

  @IsString()
  @Length(10, 300)
  reason!: string;
}

export class CreateDocumentRequirementDto extends DocumentRequirementConfigurationDto {
  @IsIn(["EGYPTIAN", "FOREIGN"])
  customerCategory!: "EGYPTIAN" | "FOREIGN";

  @IsIn(documentTypes)
  documentType!: (typeof documentTypes)[number];

  @IsBoolean()
  requiresSelfDrive!: boolean;
}

export class UpdateDocumentRequirementDto extends DocumentRequirementConfigurationDto {}
