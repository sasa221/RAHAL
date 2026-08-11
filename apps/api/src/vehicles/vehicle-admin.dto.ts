import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  Matches,
} from "class-validator";

export class ManagedVehicleImageDto {
  @IsString()
  @MaxLength(2048)
  @Matches(/^(?:\/images\/[A-Za-z0-9._/-]+|https:\/\/[^\s]+)$/)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  altAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  altEn?: string;
}

export class SaveManagedVehicleDto {
  @IsString()
  @MaxLength(100)
  branchId!: string;

  @IsString()
  @Length(2, 100)
  nameAr!: string;

  @IsString()
  @Length(2, 100)
  nameEn!: string;

  @IsString()
  @Length(2, 60)
  make!: string;

  @IsString()
  @Length(1, 60)
  model!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsString()
  @Length(2, 40)
  registrationNumber!: string;

  @IsIn(["economy", "sedan", "suv"])
  category!: "economy" | "sedan" | "suv";

  @IsIn(["AUTOMATIC", "MANUAL"])
  transmission!: "AUTOMATIC" | "MANUAL";

  @IsString()
  @Length(2, 40)
  fuelType!: string;

  @IsInt()
  @Min(2)
  @Max(20)
  seats!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  luggage?: number | null;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(8)
  doors?: number | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1_000_000)
  dailyRateEgp!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(7_000_000)
  weeklyRateEgp?: number | null;

  @IsInt()
  @Min(1)
  @Max(90)
  minimumRentalDays!: number;

  @IsIn(["OPTIONAL", "MANDATORY", "UNAVAILABLE"])
  driverPolicy!: "OPTIONAL" | "MANDATORY" | "UNAVAILABLE";

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  driverChargeEgp?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  mileageAllowancePerDay?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  depositAmountEgp?: number | null;

  @IsBoolean()
  active!: boolean;

  @IsBoolean()
  featured!: boolean;

  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ManagedVehicleImageDto)
  images!: ManagedVehicleImageDto[];
}
