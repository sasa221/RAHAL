import { IsString, IsUrl, Length, MaxLength } from "class-validator";

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
