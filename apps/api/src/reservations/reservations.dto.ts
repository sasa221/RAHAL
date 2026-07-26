import {
  Equals,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";

export class SaveReservationDraftDto {
  @IsString()
  @MaxLength(100)
  vehicleId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  pickupDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  returnDate!: string;

  @IsBoolean()
  driverRequested!: boolean;
}

const phonePattern = /^\+?[1-9]\d{7,14}$/;

export class SaveReservationCustomerDetailsDto {
  @IsIn(["EGYPTIAN", "FOREIGN"])
  customerCategory!: "EGYPTIAN" | "FOREIGN";

  @IsString()
  @Length(2, 80)
  nationality!: string;

  @IsString()
  @Length(5, 300)
  address!: string;

  @IsString()
  @Length(2, 100)
  emergencyContactName!: string;

  @Matches(phonePattern, {
    message: "emergencyContactPhone must use a valid international number format",
  })
  emergencyContactPhone!: string;
}

export class SaveReservationConsentsDto {
  @IsString()
  @MaxLength(50)
  policyVersion!: string;

  @Equals(true)
  termsAccepted!: true;

  @Equals(true)
  privacyAccepted!: true;

  @Equals(true)
  documentAccepted!: true;

  @Equals(true)
  operationalAccepted!: true;

  @IsBoolean()
  marketingAccepted!: boolean;
}

export class SalesReservationDecisionDto {
  @IsIn(["REQUEST_INFORMATION", "PRE_APPROVE", "REJECT"])
  action!: "REQUEST_INFORMATION" | "PRE_APPROVE" | "REJECT";

  @IsString()
  @Length(10, 500)
  note!: string;
}

export class CustomerInformationResponseDto {
  @IsString()
  @Length(10, 500)
  message!: string;
}

export class SalesAlternativeOfferDto {
  @IsString()
  @MaxLength(100)
  vehicleId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  pickupDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  returnDate!: string;

  @IsString()
  @Length(10, 500)
  note!: string;
}

export class CustomerAlternativeOfferDecisionDto {
  @IsIn(["ACCEPT", "DECLINE"])
  action!: "ACCEPT" | "DECLINE";
}

export class SalesBranchChecklistDto {
  @Equals(true)
  customerAttended!: true;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100_000_000)
  depositAmountEgp!: number;

  @IsString()
  @Length(3, 80)
  @Matches(/^[\p{L}\p{N}][\p{L}\p{N}\-_/ ]+$/u)
  receiptNumber!: string;

  @Equals(true)
  contractSigned!: true;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class SalesBookingOperationDto {
  @IsIn(["DELIVER", "RETURN", "COMPLETE", "CANCEL", "NO_SHOW"])
  action!: "DELIVER" | "RETURN" | "COMPLETE" | "CANCEL" | "NO_SHOW";

  @ValidateIf((input: SalesBookingOperationDto) => ["DELIVER", "RETURN"].includes(input.action))
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  odometerKm?: number;

  @ValidateIf((input: SalesBookingOperationDto) => ["DELIVER", "RETURN"].includes(input.action))
  @IsInt()
  @Min(0)
  @Max(100)
  fuelLevelPercent?: number;

  @IsString()
  @Length(10, 500)
  note!: string;
}
