import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  MinLength,
  IsUUID,
} from "class-validator";

export class SavePushSubscriptionDto {
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;

  @IsString()
  @Length(16, 512)
  p256dh!: string;

  @IsString()
  @Length(8, 256)
  auth!: string;
}

export class RemovePushSubscriptionDto {
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;
}

export class CreateNotificationCampaignDto {
  @IsIn(["GENERAL_UPDATE", "NEW_VEHICLE", "OFFER", "SERVICE_UPDATE", "URGENT"])
  category!: "GENERAL_UPDATE" | "NEW_VEHICLE" | "OFFER" | "SERVICE_UPDATE" | "URGENT";

  @IsIn(["CUSTOMERS", "SALES", "CUSTOMERS_AND_SALES"])
  audience!: "CUSTOMERS" | "SALES" | "CUSTOMERS_AND_SALES";

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  titleAr!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  titleEn!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(800)
  bodyAr!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(800)
  bodyEn!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsIn(["IN_APP", "PUSH", "EMAIL", "WHATSAPP"], { each: true })
  channels!: Array<"IN_APP" | "PUSH" | "EMAIL" | "WHATSAPP">;

  @IsBoolean()
  important!: boolean;

  @IsBoolean()
  marketing!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(/^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@/%?]*$/)
  targetPath?: string;

  @IsOptional()
  @IsUUID()
  recipientId?: string;
}

export class SearchNotificationRecipientsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  query?: string;

  @IsOptional()
  @IsIn(["ar", "en"])
  locale?: "ar" | "en";
}
